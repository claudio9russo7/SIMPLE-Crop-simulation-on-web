def deep_drainage(drainage_coefficient, root_depth, available_soil_water_content, water_holding_capacity):
    if available_soil_water_content> water_holding_capacity*root_depth:
        # Water drained below the root zone (same units as input water, per day)
        drained_water = drainage_coefficient * root_depth * (
            available_soil_water_content - water_holding_capacity
        )
        return drained_water
    return 0


def surface_run_off(precipitation, n):
    if precipitation > 0:
        potential_maximum_retention = (25400/n) - 254
        initial_abstraction = 0.2 * potential_maximum_retention
        if precipitation <= initial_abstraction:
            return 0
        daily_run_off = ((precipitation - initial_abstraction)**2)/(
            precipitation - initial_abstraction + potential_maximum_retention
        )
        return daily_run_off
    return 0


def transpiration(generic_root_water_uptake,
                  available_water,
                  potential_evapotranspiration):
    tra = min(potential_evapotranspiration,
              generic_root_water_uptake * available_water)
    return tra


