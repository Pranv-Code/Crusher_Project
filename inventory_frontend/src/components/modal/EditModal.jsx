import "./EditModal.css";
import Button from "../common/Button";

function EditModal({
    isOpen,
    title = "Edit",
    children,
    onSave,
    onClose,
}) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="edit-modal">
                <div className="edit-modal-header">
                    <h2>{title}</h2>

                    <button
                        className="close-btn"
                        onClick={onClose}
                    >
                        ✕
                    </button>
                </div>

                <div className="edit-modal-body">
                    {children}
                </div>

                <div className="edit-modal-footer">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="primary"
                        onClick={onSave}
                    >
                        Save Changes
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default EditModal;