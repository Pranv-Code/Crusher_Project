def unit_convertor(unit, qty):
    unit = unit.lower()
    qty = float(qty)
    if unit == "brass":
        return qty * 4.2

    return qty