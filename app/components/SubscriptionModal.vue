<template>
    <Teleport to="body">
        <Transition name="modal-fade">
            <div v-if="showModal && !isBlocked" class="modal-overlay">
                <div class="modal">
                    <div class="modal-header">
                        <div class="modal-logo">
                            <Icon
                                name="ph:crown-simple-bold"
                                class="crown-icon"
                            />
                            <span>Rainha da Bet</span>
                        </div>
                    </div>

                    <div class="modal-body">
                        <h2>Desbloqueie o acesso completo</h2>
                        <p>
                            Digite seu e-mail para verificar sua assinatura
                            ativa.
                        </p>

                        <div class="input-group">
                            <Icon name="ph:envelope-bold" class="input-icon" />
                            <input
                                v-model="emailInput"
                                type="email"
                                placeholder="seu@email.com"
                                class="email-input"
                                @keydown.enter="handleCheck"
                            />
                        </div>

                        <p v-if="error" class="error-msg">{{ error }}</p>
                        <p v-if="successMsg" class="success-msg">
                            {{ successMsg }}
                        </p>

                        <button
                            class="btn-verificar"
                            :disabled="checking || !emailInput"
                            @click="handleCheck"
                        >
                            <Icon
                                v-if="checking"
                                name="ph:spinner-bold"
                                class="spin"
                            />
                            <Icon v-else name="ph:check-circle-bold" />
                            {{
                                checking ? "Verificando..." : "Verificar Acesso"
                            }}
                        </button>

                        <!-- Verificação falhou: oferece solicitar liberação manual -->
                        <div v-if="notFound" class="request-block">
                            <p v-if="requestSent" class="success-msg">
                                Pedido enviado! Em breve liberaremos seu acesso.
                                Você receberá assim que for aprovado.
                            </p>
                            <template v-else>
                                <p class="request-hint">
                                    Já comprou mas não encontramos sua assinatura?
                                    Solicite a liberação manual.
                                </p>
                                <button
                                    class="btn-solicitar"
                                    :disabled="sending"
                                    @click="handleRequest"
                                >
                                    <Icon
                                        v-if="sending"
                                        name="ph:spinner-bold"
                                        class="spin"
                                    />
                                    <Icon v-else name="ph:hand-waving-bold" />
                                    {{
                                        sending
                                            ? "Enviando..."
                                            : "Solicitar liberação de acesso"
                                    }}
                                </button>
                            </template>
                        </div>

                        <div class="divider">
                            <span>ou</span>
                        </div>

                        <a
                            v-if="checkoutUrl"
                            :href="checkoutUrl"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="btn-assinar"
                            @click="dismissModal"
                        >
                            <Icon name="ph:shopping-cart-bold" />
                            Assinar Agora
                        </a>

                        <div v-else class="checkout-indisponivel">
                            <Icon name="ph:clock-bold" />
                            <span>Link de checkout em breve</span>
                        </div>
                    </div>

                    <button class="btn-fechar" @click="dismissModal">
                        Continuar sem assinar
                        <Icon name="ph:arrow-right-bold" />
                    </button>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { CHECKOUT_URLS } from "../constants/checkoutLinks";

const { showModal, checking, error, checkSubscription, dismissModal } =
    useSubscription();
const { requestAccess, sending } = useAccessRequest();
const { isBlocked } = useAccountBlocked();

const checkoutUrl = CHECKOUT_URLS.main;

const emailInput = ref("");
const successMsg = ref("");
const notFound = ref(false);
const requestSent = ref(false);

const handleCheck = async () => {
    if (!emailInput.value) return;
    successMsg.value = "";
    notFound.value = false;
    requestSent.value = false;

    const active = await checkSubscription(emailInput.value);
    if (active) {
        successMsg.value = "Assinatura ativa! Acesso liberado.";
        setTimeout(() => dismissModal(), 1200);
    } else {
        notFound.value = true;
    }
};

const handleRequest = async () => {
    const ok = await requestAccess(emailInput.value);
    if (ok) requestSent.value = true;
};
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.88);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 20px;
}

.modal {
    background: #111;
    border: 1px solid #222;
    border-radius: 20px;
    width: 100%;
    max-width: 440px;
    overflow: hidden;
    animation: modalIn 0.3s ease;
}

@keyframes modalIn {
    from {
        opacity: 0;
        transform: scale(0.92) translateY(16px);
    }
    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

.modal-header {
    background: linear-gradient(135deg, #2a0018 0%, #001a10 100%);
    border-bottom: 1px solid #1a1a1a;
    padding: 20px 24px;
}

.modal-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 18px;
    font-weight: 700;
    color: #fff;
}

.crown-icon {
    font-size: 24px;
    color: #fb65a6;
}

.modal-body {
    padding: 28px 24px 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.modal-body h2 {
    font-size: 20px;
    font-weight: 700;
    color: #fff;
    margin: 0;
}

.modal-body > p {
    font-size: 14px;
    color: #888;
    margin: 0;
}

.input-group {
    position: relative;
}

.input-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 18px;
    color: #555;
}

.email-input {
    width: 100%;
    padding: 14px 14px 14px 42px;
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 10px;
    color: #fff;
    font-size: 14px;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.2s;
}

.email-input:focus {
    border-color: #fb65a6;
}

.email-input::placeholder {
    color: #555;
}

.error-msg {
    font-size: 13px;
    color: #ef4444;
    margin: 0;
    padding: 10px 12px;
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 8px;
}

.success-msg {
    font-size: 13px;
    color: #10b981;
    margin: 0;
    padding: 10px 12px;
    background: rgba(16, 185, 129, 0.08);
    border: 1px solid rgba(16, 185, 129, 0.2);
    border-radius: 8px;
}

.btn-verificar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 14px;
    background: #fb65a6;
    color: #000;
    font-size: 15px;
    font-weight: 700;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.2s;
}

.btn-verificar:hover:not(:disabled) {
    background: #e2549a;
}

.btn-verificar:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.request-block {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
    background: #1a1a1a;
    border: 1px solid #262626;
    border-radius: 10px;
}

.request-hint {
    font-size: 13px;
    color: #aaa;
    margin: 0;
    line-height: 1.4;
}

.btn-solicitar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 13px;
    background: transparent;
    border: 1px solid #fb65a6;
    color: #fb65a6;
    font-size: 14px;
    font-weight: 700;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-solicitar:hover:not(:disabled) {
    background: rgba(251, 101, 166, 0.08);
}

.btn-solicitar:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.divider {
    display: flex;
    align-items: center;
    gap: 12px;
    color: #444;
    font-size: 12px;
}

.divider::before,
.divider::after {
    content: "";
    flex: 1;
    height: 1px;
    background: #222;
}

.btn-assinar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 14px;
    background: transparent;
    border: 1px solid #fb65a6;
    color: #fb65a6;
    font-size: 15px;
    font-weight: 700;
    border-radius: 10px;
    text-decoration: none;
    transition: all 0.2s;
    box-sizing: border-box;
}

.btn-assinar:hover {
    background: rgba(251, 101, 166, 0.08);
}

.checkout-indisponivel {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px;
    background: #1a1a1a;
    border: 1px dashed #333;
    border-radius: 10px;
    color: #555;
    font-size: 13px;
}

.btn-fechar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 16px;
    background: transparent;
    border: none;
    border-top: 1px solid #1a1a1a;
    color: #555;
    font-size: 13px;
    cursor: pointer;
    transition: color 0.2s;
}

.btn-fechar:hover {
    color: #888;
}

.spin {
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}

.modal-fade-enter-active,
.modal-fade-leave-active {
    transition: opacity 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
    opacity: 0;
}
</style>
