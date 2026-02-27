import { withLayoutContext } from "expo-router";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useAppTheme } from "@/shared/theme/useAppTheme";

const TopTabs = withLayoutContext(createMaterialTopTabNavigator().Navigator);

export default function QuotesTabLayout() {
  const theme = useAppTheme();

  return (
    <TopTabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.brandPrimary,
        tabBarInactiveTintColor: theme.colors.textSub,
        tabBarIndicatorStyle: {
          backgroundColor: theme.colors.brandPrimary,
        },
        tabBarLabelStyle: {
          fontSize: 15,
          fontWeight: "bold",
        },
      }}
    >
      <TopTabs.Screen name="market" options={{ title: "마켓" }} />
      <TopTabs.Screen name="my-orders" options={{ title: "내 오더" }} />
    </TopTabs>
  );
}
