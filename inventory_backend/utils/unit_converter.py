def unit_convertor(unit, qty):
    unit = unit.lower()
    qty = float(qty)
    if unit == "brass":
        return qty * 4.2

    return qty
def ton_to_brass(qty):
    return round(float(qty) / 4.2, 2)