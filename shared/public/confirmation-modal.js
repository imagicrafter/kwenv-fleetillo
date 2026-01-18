/**
 * Confirmation Modal Service
 * Replaces native window.confirm() with a styled modal
 */

function injectConfirmationModal() {
    if (document.getElementById('confirmation-modal')) return;

    const modalHtml = `
    <div id="confirmation-modal" class="modal confirmation-modal">
        <div class="modal-content confirmation-content">
            <div class="modal-header">
                <h3 id="confirm-title">Confirm Action</h3>
                <span class="close-modal" onclick="closeConfirmModal(false)">&times;</span>
            </div>
            <div class="modal-body">
                <p id="confirm-message">Are you sure?</p>
            </div>
            <div class="modal-actions" style="margin-top: 24px; display: flex; justify-content: flex-end; gap: 12px;">
                <button id="confirm-cancel-btn" class="btn-secondary">Cancel</button>
                <button id="confirm-ok-btn" class="btn-primary">Confirm</button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Bind global close
    window.closeConfirmModal = function (result) {
        const modal = document.getElementById('confirmation-modal');
        if (modal) {
            modal.style.display = 'none';
            // Fade out animation or similar could be added here
        }
        if (window._confirmResolve) {
            window._confirmResolve(result);
            window._confirmResolve = null;
        }
    };

    // Bind buttons
    document.getElementById('confirm-cancel-btn').addEventListener('click', () => window.closeConfirmModal(false));
    document.getElementById('confirm-ok-btn').addEventListener('click', () => window.closeConfirmModal(true));

    // Close on outside click
    document.getElementById('confirmation-modal').addEventListener('click', (event) => {
        if (event.target.id === 'confirmation-modal') {
            window.closeConfirmModal(false);
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && document.getElementById('confirmation-modal').style.display === 'block') {
            window.closeConfirmModal(false);
        }
    });
}

// Global function to show confirm
window.showConfirm = function (message, title = 'Confirm Action', confirmText = 'Confirm', cancelText = 'Cancel') {
    return new Promise((resolve) => {
        injectConfirmationModal();

        const modal = document.getElementById('confirmation-modal');
        const titleEl = document.getElementById('confirm-title');
        const msgEl = document.getElementById('confirm-message');
        const okBtn = document.getElementById('confirm-ok-btn');
        const cancelBtn = document.getElementById('confirm-cancel-btn');

        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = message;
        if (okBtn) okBtn.textContent = confirmText;
        if (cancelBtn) cancelBtn.textContent = cancelText;

        // Reset generic button styles in case they were modified
        okBtn.className = 'btn-primary';

        // Optional: Support "Destructive" actions
        if (title.toLowerCase().includes('delete') || title.toLowerCase().includes('remove')) {
            okBtn.style.backgroundColor = 'var(--accent-danger, #f85149)';
        } else {
            okBtn.style.backgroundColor = ''; // Reset to default CSS
        }

        window._confirmResolve = resolve;
        modal.style.display = 'block';

        // Focus confirm button for a11y/usability
        setTimeout(() => okBtn.focus(), 50);
    });
};
