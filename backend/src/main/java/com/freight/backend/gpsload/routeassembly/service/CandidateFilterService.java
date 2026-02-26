package com.freight.backend.gpsload.routeassembly.service;

import com.freight.backend.gpsload.route.model.Place;
import com.freight.backend.gpsload.routeassembly.model.AssemblyParameters;
import com.freight.backend.gpsload.routeassembly.model.DriverState;
import com.freight.backend.gpsload.routeassembly.model.Quote;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class CandidateFilterService {

    private static final Logger log = LoggerFactory.getLogger(CandidateFilterService.class);

    private static final double AVG_SPEED_KMH = 40.0;
    private static final int PICKUP_HANDLING_MINUTES = 20;
    private static final double HOME_ROUTE_DETOUR_LIMIT = 1.45;
    private static final double GENERAL_DETOUR_LIMIT = 2.00;
    private static final double SCHEDULED_QUOTE_DETOUR_LIMIT = 1.60;

    public List<Quote> filterCandidates(
            DriverState driverState,
            List<Quote> candidates,
            AssemblyParameters params
    ) {
        List<Quote> filtered = new ArrayList<>();
        for (Quote quote : candidates) {
            if (passesAllFilters(driverState, quote, params)) {
                filtered.add(quote);
            }
        }
        return filtered;
    }

    private boolean passesAllFilters(
            DriverState driverState,
            Quote quote,
            AssemblyParameters params
    ) {
        if (!passesStatusFilter(quote)) {
            return false;
        }
        if (!quote.hasValidCoordinates()) {
            return false;
        }

        Place startLocation = resolveStartLocation(driverState);
        LocalDateTime availableTime = resolveAvailableTime(driverState);

        if (!passesRadiusFilter(startLocation, quote.origin(), params.radiusKm())) {
            return false;
        }

        if (driverState.endLocation() != null) {
            if (!passesDirectionFilter(
                    startLocation,
                    driverState.endLocation(),
                    quote.destination(),
                    params.directionAngleDegrees()
            )) {
                return false;
            }
        }

        if (!passesScheduleFilter(startLocation, availableTime, quote)) {
            return false;
        }

        if (!passesCapacityFilter(driverState, quote)) {
            return false;
        }

        if (!passesCombinePreferenceFilter(driverState, quote)) {
            return false;
        }

        return true;
    }

    private boolean passesStatusFilter(Quote quote) {
        return quote != null
                && quote.status() != null
                && "OPEN".equalsIgnoreCase(quote.status().trim());
    }

    private boolean passesRadiusFilter(Place from, Place to, double radiusKm) {
        double distance = haversineDistance(
                from.latitude(), from.longitude(),
                to.latitude(), to.longitude()
        );
        return distance <= radiusKm;
    }

    private boolean passesDirectionFilter(
            Place current,
            Place end,
            Place cargoDestination,
            double maxAngleDegrees
    ) {
        double driverBearing = calculateBearing(
                current.latitude(), current.longitude(),
                end.latitude(), end.longitude()
        );

        double cargoBearing = calculateBearing(
                current.latitude(), current.longitude(),
                cargoDestination.latitude(), cargoDestination.longitude()
        );

        double angleDiff = Math.abs(driverBearing - cargoBearing);
        if (angleDiff > 180) {
            angleDiff = 360 - angleDiff;
        }

        return angleDiff <= maxAngleDegrees;
    }

    private boolean passesScheduleFilter(Place driverLocation, LocalDateTime availableTime, Quote quote) {
        if (!quote.hasScheduledDate()) {
            return true;
        }

        LocalDateTime now = availableTime != null ? availableTime : LocalDateTime.now();
        LocalDateTime scheduled = quote.scheduledDate();
        if (scheduled.isBefore(now)) {
            return false;
        }

        double distKm = haversineDistance(
                driverLocation.latitude(), driverLocation.longitude(),
                quote.origin().latitude(), quote.origin().longitude()
        ) * 1.3;

        double travelMinutes = (distKm / AVG_SPEED_KMH) * 60;
        double totalMinutes = travelMinutes + PICKUP_HANDLING_MINUTES;
        LocalDateTime estimatedArrival = now.plusMinutes((long) Math.ceil(totalMinutes));

        boolean canArrive = !estimatedArrival.isAfter(scheduled);
        if (!canArrive) {
            log.debug("schedule filter rejected - quoteId={}, estimatedArrival={}, scheduled={}",
                    quote.quoteId(), estimatedArrival, scheduled);
        }
        return canArrive;
    }

    private Place resolveStartLocation(DriverState driverState) {
        if (driverState != null
                && driverState.remainingDeliveries() != null
                && !driverState.remainingDeliveries().isEmpty()) {
            return driverState.remainingDeliveries().get(driverState.remainingDeliveries().size() - 1);
        }
        return driverState.currentLocation();
    }

    private LocalDateTime resolveAvailableTime(DriverState driverState) {
        LocalDateTime now = LocalDateTime.now();
        if (driverState == null) {
            return now;
        }

        LocalDateTime base = driverState.availableAt() != null && driverState.availableAt().isAfter(now)
                ? driverState.availableAt()
                : now;

        if (driverState.remainingDeliveries() == null || driverState.remainingDeliveries().isEmpty()) {
            return base;
        }

        Place cursor = driverState.currentLocation();
        long extraMinutes = 0L;
        for (Place stop : driverState.remainingDeliveries()) {
            if (cursor != null && stop != null
                    && cursor.latitude() != null && cursor.longitude() != null
                    && stop.latitude() != null && stop.longitude() != null) {
                double distKm = haversineDistance(
                        cursor.latitude(), cursor.longitude(),
                        stop.latitude(), stop.longitude()
                ) * 1.3;
                extraMinutes += (long) Math.ceil((distKm / AVG_SPEED_KMH) * 60);
            }
            extraMinutes += 10;
            cursor = stop;
        }

        return base.plusMinutes(extraMinutes);
    }

    public boolean canMeetAllSchedules(Place driverLocation, List<Quote> quotes) {
        LocalDateTime cursor = LocalDateTime.now();
        Place currentPos = driverLocation;

        for (Quote q : quotes) {
            if (!q.hasScheduledDate()) continue;

            double distKm = haversineDistance(
                    currentPos.latitude(), currentPos.longitude(),
                    q.origin().latitude(), q.origin().longitude()
            ) * 1.3;

            long travelMinutes = (long) Math.ceil((distKm / AVG_SPEED_KMH) * 60);
            long handlingMinutes = PICKUP_HANDLING_MINUTES;

            LocalDateTime arrivalAtPickup = cursor.plusMinutes(travelMinutes);
            if (arrivalAtPickup.isAfter(q.scheduledDate())) {
                return false;
            }

            cursor = arrivalAtPickup.plusMinutes(handlingMinutes);
            currentPos = q.origin();
        }

        return true;
    }

    private boolean passesCapacityFilter(DriverState driverState, Quote quote) {
        double cbm = quote.volumeCbm() != null ? quote.volumeCbm() : 0;
        double weight = quote.weightKg() != null ? quote.weightKg() : 0;
        return driverState.canLoad(cbm, weight);
    }

    private boolean passesCombinePreferenceFilter(DriverState driverState, Quote quote) {
        if (driverState == null || quote == null) {
            return false;
        }

        DriverState.CombinePreference preference = driverState.combinePreference();
        if (preference == null || preference == DriverState.CombinePreference.DISALLOW) {
            // DISALLOW는 조합 생성 단계에서 처리(단건 추천), 여기서는 단건 수락 가능.
            return true;
        }

        Place endLocation = driverState.endLocation();
        if (endLocation == null || !quote.hasValidCoordinates()) {
            return true;
        }

        Place start = resolveStartLocation(driverState);
        if (start == null || start.latitude() == null || start.longitude() == null) {
            return true;
        }

        double detourFactor = calculateDetourFactor(start, quote, endLocation);
        double detourLimit = preference == DriverState.CombinePreference.HOME_ROUTE
                ? HOME_ROUTE_DETOUR_LIMIT
                : GENERAL_DETOUR_LIMIT;

        if (quote.hasScheduledDate()) {
            detourLimit = Math.min(detourLimit, SCHEDULED_QUOTE_DETOUR_LIMIT);
        }

        return detourFactor <= detourLimit;
    }

    public double calculateDetourFactor(Place current, Quote quote) {
        return calculateDetourFactor(current, quote, null);
    }

    public double calculateDetourFactor(Place current, Quote quote, Place endLocation) {
        Place returnTo = endLocation != null ? endLocation : current;

        double directDist = haversineDistance(
                current.latitude(), current.longitude(),
                quote.destination().latitude(), quote.destination().longitude()
        ) + haversineDistance(
                quote.destination().latitude(), quote.destination().longitude(),
                returnTo.latitude(), returnTo.longitude()
        );

        double actualDist = haversineDistance(
                current.latitude(), current.longitude(),
                quote.origin().latitude(), quote.origin().longitude()
        ) + haversineDistance(
                quote.origin().latitude(), quote.origin().longitude(),
                quote.destination().latitude(), quote.destination().longitude()
        ) + haversineDistance(
                quote.destination().latitude(), quote.destination().longitude(),
                returnTo.latitude(), returnTo.longitude()
        );

        return actualDist / Math.max(5.0, directDist);
    }

    public boolean passesDetourFilter(Place current, Quote quote, double detourFactorLimit) {
        if (detourFactorLimit <= 0) return true;
        double factor = calculateDetourFactor(current, quote);
        return factor <= detourFactorLimit;
    }

    public String getEfficiencyRating(double detourFactor) {
        if (detourFactor < 1.2) return "GREEN";
        if (detourFactor < 1.5) return "YELLOW";
        return "GRAY";
    }

    public List<DetourInfo> calculateAllDetourFactors(Place current, List<Quote> quotes) {
        List<DetourInfo> results = new ArrayList<>();
        for (Quote quote : quotes) {
            double factor = calculateDetourFactor(current, quote);
            double profitPerKm = 0;
            if (quote.finalPrice() != null) {
                double distKm = haversineDistance(
                        current.latitude(), current.longitude(),
                        quote.origin().latitude(), quote.origin().longitude()
                ) + haversineDistance(
                        quote.origin().latitude(), quote.origin().longitude(),
                        quote.destination().latitude(), quote.destination().longitude()
                );
                profitPerKm = distKm > 0 ? quote.finalPrice() / distKm : 0;
            }
            results.add(new DetourInfo(
                    quote.quoteId(), factor,
                    getEfficiencyRating(factor), profitPerKm
            ));
        }
        return results;
    }

    public record DetourInfo(
            Long quoteId,
            double detourFactor,
            String efficiencyRating,
            double profitPerKm
    ) {
    }

    public double haversineDistance(double lat1, double lng1, double lat2, double lng2) {
        final double r = 6371.0;

        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return r * c;
    }

    private double calculateBearing(double lat1, double lng1, double lat2, double lng2) {
        double dLng = Math.toRadians(lng2 - lng1);
        double lat1Rad = Math.toRadians(lat1);
        double lat2Rad = Math.toRadians(lat2);

        double x = Math.sin(dLng) * Math.cos(lat2Rad);
        double y = Math.cos(lat1Rad) * Math.sin(lat2Rad)
                - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

        double bearing = Math.toDegrees(Math.atan2(x, y));
        return (bearing + 360) % 360;
    }

    public double distanceToQuote(Place from, Quote quote) {
        return haversineDistance(
                from.latitude(), from.longitude(),
                quote.origin().latitude(), quote.origin().longitude()
        );
    }
}
