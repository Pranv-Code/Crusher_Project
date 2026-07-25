from db import get_system_setting

def get_tons_per_brass_setting(cursor=None):
    """Retrieve the configurable tons per brass conversion factor (default 4.2)."""
    try:
        val = get_system_setting("tons_per_brass", "4.2", cursor)
        f = float(val or 4.2)
        return f if f > 0 else 4.2
    except Exception:
        return 4.2


def unit_convertor(unit, qty, tons_per_brass=None, cursor=None):
    """Convert an entered quantity to tons for DB storage.
    
    Rule: 1 Brass = <tons_per_brass> Tons (default 4.2)
    brass → tons : multiply by factor
    tons  → tons : no change
    """
    unit = str(unit or "tons").lower()
    qty = float(qty or 0)
    if unit == "brass":
        factor = tons_per_brass if tons_per_brass is not None else get_tons_per_brass_setting(cursor)
        return round(qty * factor, 6)

    return qty  # already in tons


def ton_to_brass(qty, tons_per_brass=None, cursor=None):
    """Convert a stored tons value back to brass for display.
    
    Rule: 1 Brass = <tons_per_brass> Tons (default 4.2)
    tons → brass : divide by factor
    """
    qty = float(qty or 0)
    factor = tons_per_brass if tons_per_brass is not None else get_tons_per_brass_setting(cursor)
    if factor <= 0:
        factor = 4.2
    return round(qty / factor, 2)