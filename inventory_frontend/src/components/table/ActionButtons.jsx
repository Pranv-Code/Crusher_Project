import "./ActionButtons.css";
import Button from "../common/Button";

function ActionButtons({
    onEdit,
    onDelete,
    showEdit = true,
    showDelete = true,
}) {
    return (
        <div className="action-buttons">
            {showEdit && (
                <Button
                    variant="primary"
                    onClick={onEdit}
                >
                    Edit
                </Button>
            )}

            {showDelete && (
                <Button
                    variant="danger"
                    onClick={onDelete}
                >
                    Delete
                </Button>
            )}
        </div>
    );
}

export default ActionButtons;