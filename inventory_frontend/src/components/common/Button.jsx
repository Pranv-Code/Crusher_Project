import "./Button.css";

function Button({
    children,
    variant = "primary",
    type = "button",
    onClick,
    disabled = false,
    className = "",
}) {
    return (
        <button
            type={type}
            className={`btn btn-${variant} ${className}`}
            onClick={onClick}
            disabled={disabled}
        >
            {children}
        </button>
    );
}

export default Button;