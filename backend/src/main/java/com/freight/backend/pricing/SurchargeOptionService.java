package com.freight.backend.pricing;

import com.freight.backend.repository.SurchargeOptionRepository;
import com.freight.backend.repository.SurchargeOptionVehicleRateRepository;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SurchargeOptionService {

    private final SurchargeOptionRepository optionRepository;
    private final SurchargeOptionVehicleRateRepository rateRepository;

    public Set<SurchargeOptionRule> resolveOptionsByCodes(Set<String> codes) {
        if (codes == null || codes.isEmpty()) {
            return Collections.emptySet();
        }
        List<SurchargeOptionEntity> options = optionRepository.findByCodeInAndEnabledTrue(codes);
        if (options.isEmpty()) {
            return Collections.emptySet();
        }

        List<Long> ids = options.stream()
                .map(SurchargeOptionEntity::getId)
                .collect(Collectors.toList());
        Map<Long, List<SurchargeOptionVehicleRate>> ratesByOptionId = ids.isEmpty()
                ? Collections.emptyMap()
                : rateRepository.findByOption_IdIn(ids).stream()
                        .collect(Collectors.groupingBy(r -> r.getOption().getId()));

        return options.stream()
                .map(option -> toRule(option, ratesByOptionId.get(option.getId())))
                .collect(Collectors.toSet());
    }

    private SurchargeOptionRule toRule(
            SurchargeOptionEntity option,
            List<SurchargeOptionVehicleRate> rates
    ) {
        Map<String, java.math.BigDecimal> vehicleAdds = null;
        if (rates != null && !rates.isEmpty()) {
            vehicleAdds = rates.stream()
                    .collect(Collectors.toMap(
                            SurchargeOptionVehicleRate::getVehicleType,
                            SurchargeOptionVehicleRate::getAddWon
                    ));
        }

        return new SurchargeOptionRule(
                option.getCode(),
                option.getOptionType(),
                option.getMinAddWon(),
                option.getMaxAddWon(),
                option.getMinMultiplier(),
                option.getMaxMultiplier(),
                option.getFixedAddWon(),
                vehicleAdds
        );
    }
}
