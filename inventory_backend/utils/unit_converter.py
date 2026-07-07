def unit_convertor(unit, qty):
    unit = unit.lower()

    if unit == "brass":
        return qty * 4.2

    return qty