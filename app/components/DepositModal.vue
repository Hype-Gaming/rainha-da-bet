<template>
    <Teleport to="body">
        <Transition name="modal">
            <div
                v-if="isModalOpen"
                class="modal-overlay"
                @click.self="closeModal"
            >
                <div class="modal-container">
                    <!-- Header -->
                    <div class="modal-header">
                        <h2 class="modal-title">
                            <Icon name="ph:pix-logo-bold" />
                            Depósito via PIX
                        </h2>
                        <button class="close-btn" @click="closeModal">
                            <Icon name="ph:x-bold" />
                        </button>
                    </div>

                    <!-- Content -->
                    <div class="modal-content">
                        <!-- Step 1: Valor do Depósito -->
                        <div v-if="step === 'amount'" class="step-amount">
                            <p class="step-description">
                                Digite o valor que deseja depositar:
                            </p>

                            <div class="amount-input-wrapper">
                                <span class="currency">R$</span>
                                <input
                                    type="number"
                                    v-model.number="inputAmount"
                                    placeholder="0,00"
                                    min="1"
                                    step="0.01"
                                    class="amount-input"
                                    @keyup.enter="handleDeposit"
                                />
                            </div>

                            <!-- Quick Values -->
                            <div class="quick-values">
                                <button
                                    v-for="value in quickValues"
                                    :key="value"
                                    class="quick-btn"
                                    @click="inputAmount = value"
                                >
                                    R$ {{ value }}
                                </button>
                            </div>

                            <!-- Error Message -->
                            <div v-if="error" class="error-message">
                                <Icon name="ph:warning-circle-bold" />
                                {{ error }}
                            </div>

                            <!-- Submit Button -->
                            <button
                                class="submit-btn"
                                :disabled="loading || inputAmount < 1"
                                @click="handleDeposit"
                            >
                                <Icon
                                    v-if="loading"
                                    name="ph:spinner"
                                    class="spinner"
                                />
                                <span v-if="loading">Gerando PIX...</span>
                                <span v-else>Gerar QR Code PIX</span>
                            </button>
                        </div>

                        <!-- Step 2: QR Code e Código PIX -->
                        <div v-if="step === 'payment'" class="step-payment">
                            <div class="payment-info">
                                <p class="payment-amount">
                                    Valor:
                                    <strong>{{ formatAmount(amount) }}</strong>
                                </p>
                                <p class="payment-id">
                                    ID: {{ depositData?.transaction_id }}
                                </p>
                            </div>

                            <!-- QR Code -->
                            <div class="qr-code-wrapper">
                                <img
                                    :src="depositData?.qr_code"
                                    alt="QR Code PIX"
                                    class="qr-code-image"
                                />
                            </div>

                            <!-- Código Copia e Cola -->
                            <div class="pix-code-wrapper">
                                <p class="pix-label">
                                    Código PIX (Copia e Cola):
                                </p>
                                <div class="pix-code-box">
                                    <input
                                        type="text"
                                        :value="depositData?.br_code"
                                        readonly
                                        class="pix-code-input"
                                    />
                                    <button
                                        class="copy-btn"
                                        @click="handleCopy"
                                    >
                                        <Icon
                                            :name="
                                                copied
                                                    ? 'ph:check-bold'
                                                    : 'ph:copy-bold'
                                            "
                                        />
                                        {{ copied ? "Copiado!" : "Copiar" }}
                                    </button>
                                </div>
                            </div>

                            <!-- Instructions -->
                            <div class="instructions">
                                <h4>Como pagar:</h4>
                                <ol>
                                    <li>Abra o app do seu banco</li>
                                    <li>Escolha pagar com PIX</li>
                                    <li>Escaneie o QR Code ou cole o código</li>
                                    <li>Confirme o pagamento</li>
                                </ol>
                            </div>

                            <!-- Confirm Button -->
                            <button
                                class="submit-btn success"
                                @click="handleConfirm"
                            >
                                <Icon name="ph:check-circle-bold" />
                                Já fiz o pagamento
                            </button>
                        </div>

                        <!-- Step 3: Sucesso -->
                        <div v-if="step === 'success'" class="step-success">
                            <div class="success-icon">
                                <Icon name="ph:check-circle-bold" />
                            </div>
                            <h3 class="success-title">
                                Pagamento em processamento!
                            </h3>
                            <p class="success-description">
                                Seu depósito de
                                <strong>{{ formatAmount(amount) }}</strong> está
                                sendo processado. O saldo será atualizado em
                                alguns instantes.
                            </p>
                            <button class="submit-btn" @click="closeModal">
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
const {
    isModalOpen,
    step,
    amount,
    depositData,
    loading,
    error,
    closeModal,
    createDeposit,
    copyPixCode,
    confirmPayment,
    formatAmount,
} = useDeposit();

const inputAmount = ref(0);
const copied = ref(false);
const quickValues = [10, 20, 50, 100, 200, 500];

const handleDeposit = async () => {
    if (inputAmount.value < 1) return;

    const result = await createDeposit(inputAmount.value);
    if (!result.success) {
        console.error(result.message);
    }
};

const handleCopy = async () => {
    const success = await copyPixCode();
    if (success) {
        copied.value = true;
        setTimeout(() => {
            copied.value = false;
        }, 2000);
    }
};

const handleConfirm = () => {
    confirmPayment();
};

// Reset input when modal opens
watch(isModalOpen, (isOpen) => {
    if (isOpen) {
        inputAmount.value = 0;
        copied.value = false;
    }
});
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
}

.modal-container {
    background: #111;
    border: 1px solid #222;
    border-radius: 16px;
    width: 100%;
    max-width: 480px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(251, 101, 166, 0.15);
}

.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid #222;
}

.modal-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 18px;
    font-weight: 600;
    color: #fff;
    margin: 0;
}

.modal-title :deep(svg) {
    font-size: 24px;
    color: #fb65a6;
}

.close-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 8px;
    color: #888;
    cursor: pointer;
    transition: all 0.2s ease;
}

.close-btn:hover {
    background: #222;
    color: #fff;
}

.modal-content {
    padding: 24px;
}

/* Step Amount */
.step-description {
    color: #888;
    font-size: 14px;
    margin-bottom: 20px;
    text-align: center;
}

.amount-input-wrapper {
    display: flex;
    align-items: center;
    background: #1a1a1a;
    border: 2px solid #333;
    border-radius: 12px;
    padding: 16px 20px;
    margin-bottom: 16px;
    transition: border-color 0.2s ease;
}

.amount-input-wrapper:focus-within {
    border-color: #fb65a6;
}

.currency {
    font-size: 24px;
    font-weight: 600;
    color: #fb65a6;
    margin-right: 8px;
}

.amount-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    font-size: 32px;
    font-weight: 700;
    color: #fff;
    width: 100%;
}

.amount-input::placeholder {
    color: #444;
}

/* Remove spinner from number input */
.amount-input::-webkit-outer-spin-button,
.amount-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

.amount-input[type="number"] {
    -moz-appearance: textfield;
    appearance: textfield;
}

.quick-values {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 20px;
}

.quick-btn {
    padding: 12px 16px;
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 8px;
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
}

.quick-btn:hover {
    background: #222;
    border-color: #fb65a6;
    color: #fb65a6;
}

.error-message {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    color: #ef4444;
    font-size: 14px;
    margin-bottom: 16px;
}

.submit-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 16px 24px;
    background: linear-gradient(135deg, #fb65a6 0%, #fb65a6 100%);
    border: none;
    border-radius: 10px;
    color: #000;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.submit-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(251, 101, 166, 0.35);
}

.submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.submit-btn.success {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.spinner {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}

/* Step Payment */
.payment-info {
    text-align: center;
    margin-bottom: 20px;
}

.payment-amount {
    font-size: 18px;
    color: #fff;
    margin-bottom: 4px;
}

.payment-amount strong {
    color: #fb65a6;
}

.payment-id {
    font-size: 12px;
    color: #666;
}

.qr-code-wrapper {
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
}

.qr-code-image {
    width: 200px;
    height: 200px;
    background: #fff;
    border-radius: 12px;
    padding: 10px;
}

.pix-code-wrapper {
    margin-bottom: 20px;
}

.pix-label {
    font-size: 12px;
    color: #888;
    margin-bottom: 8px;
}

.pix-code-box {
    display: flex;
    gap: 8px;
}

.pix-code-input {
    flex: 1;
    padding: 12px 16px;
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 8px;
    color: #fff;
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
}

.copy-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 12px 16px;
    background: #fb65a6;
    border: none;
    border-radius: 8px;
    color: #000;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
}

.copy-btn:hover {
    background: #e2549a;
}

.instructions {
    background: #1a1a1a;
    border: 1px solid #222;
    border-radius: 10px;
    padding: 16px;
    margin-bottom: 20px;
}

.instructions h4 {
    font-size: 14px;
    color: #fff;
    margin-bottom: 10px;
}

.instructions ol {
    margin: 0;
    padding-left: 20px;
    color: #888;
    font-size: 13px;
}

.instructions li {
    margin-bottom: 6px;
}

/* Step Success */
.step-success {
    text-align: center;
    padding: 20px 0;
}

.success-icon {
    width: 80px;
    height: 80px;
    margin: 0 auto 20px;
    background: rgba(16, 185, 129, 0.1);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.success-icon :deep(svg) {
    font-size: 48px;
    color: #10b981;
}

.success-title {
    font-size: 20px;
    font-weight: 600;
    color: #fff;
    margin-bottom: 12px;
}

.success-description {
    font-size: 14px;
    color: #888;
    margin-bottom: 24px;
    line-height: 1.5;
}

.success-description strong {
    color: #fb65a6;
}

/* Modal Transitions */
.modal-enter-active,
.modal-leave-active {
    transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
    transform: scale(0.95) translateY(20px);
}

/* Responsive */
@media (max-width: 480px) {
    .modal-overlay {
        padding: 16px;
        align-items: center;
    }

    .modal-container {
        max-height: 90vh;
        border-radius: 16px;
        margin: auto;
    }

    .modal-content {
        padding: 16px;
    }

    .amount-input {
        font-size: 24px;
    }

    .quick-values {
        grid-template-columns: repeat(2, 1fr);
    }

    .qr-code-image {
        width: 160px;
        height: 160px;
    }

    .pix-code-box {
        flex-direction: column;
    }
}
</style>
