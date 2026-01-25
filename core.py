from dataclasses import dataclass
import functions as fun
import soil_water_module as swm


@dataclass
class Parameters:
    #phenology and canopy
    tbase: float
    topt: float
    tsum: float
    solar_max: float
    i50a: float
    #biomass
    rue: float
    hi: float
    #stresses factors
    theat: float
    textreme: float
    sc02: float
    swater: float
    i50b_max_heat: float
    i50b_max_water: float
    #soil
    generic_root_uptake: float

@dataclass
class Soil:
    #root_depth
    rootdepth: float
    available_water: float
    curve_number: float
    maximum_soil_water_holding: float
    drainage_coefficient: float


@dataclass
class State:
    tt: float
    biomass: float
    i50b: float
    available_water: float


def clampint_0_1(x: float) -> float:
    return max(0.0, min(1.0, x))


def step(day, s: State, p: Parameters, soil: Soil):
    #submodule soil
    available_water = s.available_water * soil.rootdepth
    precipitation = day["precp"]
    irrigation = day["irr"]
    new_water_available = available_water + precipitation + irrigation
    drainage = swm.deep_drainage(soil.drainage_coefficient,
                                 soil.rootdepth, new_water_available,
                                 soil.maximum_soil_water_holding)

    run_off = swm.surface_run_off(precipitation, soil.curve_number)
    new_water_available_2 = new_water_available - (drainage + run_off)
    transpiration = swm.transpiration(p.generic_root_uptake, new_water_available_2, day["et0"])
    final_water_available_mm = max(0.0, new_water_available_2 - transpiration)
    final_water_available = final_water_available_mm / soil.rootdepth
    #phenology
    dtt = fun.phenology(day["tmean"], p.tbase)
    tt = s.tt + dtt
    #temp_effect
    ft = fun.ftemp(day["tmean"], p.tbase, p.topt)
    fh = fun.fheat(day["tmax"], p.textreme, p.theat)
    fc02 = fun.fc02(p.sc02, day["c02"])
    #drought_stress
    ar = fun.arid(day["et0"], final_water_available)
    fwater = fun.fwater(p.swater, ar)
    fwater = clampint_0_1(fwater)
    #effect_of_water_and_heat_on_i50
    i50b = s.i50b
    i50b = fun.reduction_ib_due_to_water(i50b, p.i50b_max_water, fwater)
    i50b = fun.reduction_ib_due_to_heat(i50b, p.i50b_max_heat, fh)
    #canopy interception
    fsol = fun.solar(p.solar_max, p.i50a, i50b, tt, p.tsum) * fun.impact_of_water_on_solar_interception(fwater)
    #biomass
    biomass_increase = fun.biomass_rate(day["rad"], fsol, p.rue, fc02, ft, fh, fwater)
    biomass = s.biomass + biomass_increase
    s2 = State(tt=tt, biomass=biomass, i50b=i50b, available_water=final_water_available)
    diagnostic = {"dtt": dtt, "fsol": fsol,
                  "ft": ft, "fh": fh, "fw": fwater,
                  "arid": ar,
                  "biomass_increase": biomass_increase}
    return s2, diagnostic


def simulate(forcings, s0: State, p:Parameters, soil:Soil):
    s = s0
    out = []
    for day in forcings:
        s, diagnostic = step(day, s, p, soil)
        out.append({"tt":s.tt, "biomass": s.biomass, "i50b": s.i50b, **diagnostic})
        if s.tt >= p.tsum:
            break
    return out




