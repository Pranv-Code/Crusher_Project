import "./ConfirmModal.css";
import Button from "../common/Button";

function ConfirmModal({
    isOpen,
    title = "Confirm Action",
    message = "Are you sure?",
    onConfirm,
    onCancel,
}) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="confirm-modal">
                <h2>{title}</h2>

                <p>{message}</p>

                <div className="modal-actions">
                    <Button
                        variant="secondary"
                        onClick={onCancel}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="danger"
                        onClick={onConfirm}
                    >
                        Confirm
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmModal;