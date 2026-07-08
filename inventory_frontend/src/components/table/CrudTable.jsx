import "./CrudTable.css";
import EmptyState from "../common/EmptyState";

function CrudTable({
    columns = [],
    data = [],
    renderActions,
    keyField = "id",
}) {
    if (!data.length) {
        return <EmptyState />;
    }

    return (
        <div className="crud-table-container">
            <table className="crud-table">
                <thead>
                    <tr>
                        {columns.map((column) => (
                            <th key={column.key}>
                                {column.label}
                            </th>
                        ))}

                        {renderActions && (
                            <th className="actions-column">
                                Actions
                            </th>
                        )}
                    </tr>
                </thead>

                <tbody>
                    {data.map((row) => (
                        <tr key={row[keyField]}>
                            {columns.map((column) => (
                                <td key={column.key}>
                                    {column.render
                                        ? column.render(row)
                                        : row[column.key]}
                                </td>
                            ))}

                            {renderActions && (
                                <td className="actions-cell">
                                    {renderActions(row)}
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default CrudTable;