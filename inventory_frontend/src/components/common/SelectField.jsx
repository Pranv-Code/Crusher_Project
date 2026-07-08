import "./SelectField.css";

function SelectField({
    label,
    name,
    value,
    onChange,
    options = [],
    required = false,
    disabled = false,
}) {
    return (
        <div className="select-field">
            {label && <label htmlFor={name}>{label}</label>}

            <select
                id={name}
                name={name}
                value={value}
                onChange={onChange}
                required={required}
                disabled={disabled}
            >
                <option value="">Select {label}</option>

                {options.map((option) => (
                    <option
                        key={option.value}
                        value={option.value}
                    >
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default SelectField;