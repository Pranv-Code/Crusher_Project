def unit_convertor(unit, qty):
    """Convert an entered quantity to tons for DB storage.
    
    1 ton = 4.2 brass
    brass → tons : divide by 4.2
    tons  → tons : no change
    """
    unit = unit.lower()
    qty = float(qty)
    if unit == "brass":
        return round(qty / 4.2, 6)  # brass ÷ 4.2 = tons

    return qty  # already in tons


def ton_to_brass(qty):
    """Convert a stored tons value back to brass for display.
    
    tons → brass : multiply by 4.2
    """
    return round(float(qty) * 4.2, 2)