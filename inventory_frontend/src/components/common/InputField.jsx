import "./InputField.css";

function InputField({
    label,
    name,
    type = "text",
    value,
    onChange,
    placeholder = "",
    required = false,
    disabled = false,
    min,
    max,
    step,
}) {
    return (
        <div className="input-field">
            {label && <label htmlFor={name}>{label}</label>}

            <input
                id={name}
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                min={min}
                max={max}
                step={step}
            />
        </div>
    );
}

export default InputField;