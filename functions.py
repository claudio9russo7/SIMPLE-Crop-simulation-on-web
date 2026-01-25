import numpy as np


def phenology(temp_average, tbase):
    if temp_average > tbase:
        delta_tt = temp_average - tbase
        return delta_tt
    else:
        return 0


def biomass_rate(radiation, fsolar, rue, fc02, ftemp, fheat, fwater):
    rate = radiation * fsolar * rue * fc02 * ftemp * min(fheat, fwater)
    return rate


def solar(solar_max, i50a, i50b, tt, tsum):
    solar_i = min(
        (solar_max/(1+np.exp(-0.01*(tt-i50a)))),
        (solar_max/(1+np.exp(0.01*(tt-(tsum-i50b)))))
    )
    return solar_i


def ftemp(temp_average, tbase, topt):
    if temp_average < tbase:
        return 0
    elif tbase <= temp_average < topt:
        temperature_impact = (temp_average - tbase)/(topt-tbase)
        return temperature_impact
    else:
        return 1


def fheat(tmax, textreme, theat):
    if tmax <= theat:
        return 1
    elif theat < tmax <= textreme:
        heat_impact = 1 - ((tmax -theat)/(textreme-theat))
        return heat_impact
    else:
        return 0


def reduction_ib_due_to_heat(i50b, i50b_max_heat, fheat):
    new_i50b_heat = i50b + i50b_max_heat * (1-fheat)
    return new_i50b_heat


def fc02(sc02, c02_concentration):
    if 350 <= c02_concentration < 700:
        c02_impact = 1 + sc02*(c02_concentration - 350)
        return c02_impact
    else:
        return 1 + sc02*350


def fwater(swater, arid):
    water_impact = 1 - swater*arid
    return water_impact


def arid(et0, paw):
    if et0 <= 0:
        return 0.0
    paw = max(0.0, paw)
    arid_coefficient = 1 - (min(et0, paw)/et0)
    return max(0.0, min(1, arid_coefficient))


def reduction_ib_due_to_water(i50b, i50b_max_water, fwater):
    new_i50b_water = i50b + i50b_max_water * (1 - fwater)
    return new_i50b_water


def impact_of_water_on_solar_interception(fwater):
    if fwater < 0.1:
        impact = 0.9 + fwater
        return impact
    else:
        return 1


