import "./PageHeader.css";

function PageHeader({
    title,
    subtitle = "",
    actions,
}) {
    return (
        <div className="page-header">
            <div className="page-header-left">
                <h2>{title}</h2>
                {subtitle && <p>{subtitle}</p>}
            </div>

            <div className="page-header-right">
                {actions}
            </div>
        </div>
    );
}

export default PageHeader;