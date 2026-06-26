<template>
    <div class="assinar-page">
        <div class="container">
            <div class="card">
                <div class="logo">
                    <Icon name="ph:crown-simple-bold" class="crown-icon" />
                    <h1>Rainha da Bet</h1>
                </div>

                <div class="content">
                    <h2>Acesso Exclusivo</h2>
                    <p>
                        Você ainda não possui uma assinatura ativa para acessar
                        a Rainha da Bet.
                    </p>

                    <div class="features">
                        <div class="feature">
                            <Icon name="ph:chart-line-up-bold" />
                            <span>Sinais em tempo real</span>
                        </div>
                        <div class="feature">
                            <Icon name="ph:brain-bold" />
                            <span>Estratégias personalizadas</span>
                        </div>
                        <div class="feature">
                            <Icon name="ph:lock-open-bold" />
                            <span>Acesso a todos os jogos</span>
                        </div>
                    </div>

                    <a
                        v-if="checkoutUrl"
                        :href="checkoutUrl"
                        target="_blank"
                        class="btn-assinar"
                    >
                        <Icon name="ph:shopping-cart-bold" />
                        Assinar Agora
                    </a>

                    <div v-else class="checkout-pendente">
                        <Icon name="ph:clock-bold" />
                        <span>Link de checkout em breve</span>
                    </div>

                    <p class="já-comprei">
                        Já comprou?
                        <button
                            class="btn-verificar"
                            :disabled="verificando"
                            @click="verificarAcesso"
                        >
                            {{
                                verificando
                                    ? "Verificando..."
                                    : "Clique aqui para verificar seu acesso"
                            }}
                        </button>
                    </p>

                    <p
                        v-if="mensagemVerificacao"
                        class="mensagem"
                        :class="mensagemTipo"
                    >
                        {{ mensagemVerificacao }}
                    </p>

                    <!-- Verificação falhou: solicitar liberação manual -->
                    <div v-if="mostrarSolicitar" class="solicitar-block">
                        <p v-if="pedidoEnviado" class="mensagem sucesso">
                            Pedido enviado! Em breve liberaremos seu acesso.
                        </p>
                        <button
                            v-else
                            class="btn-solicitar"
                            :disabled="sending"
                            @click="solicitarLiberacao"
                        >
                            {{
                                sending
                                    ? "Enviando..."
                                    : "Solicitar liberação de acesso"
                            }}
                        </button>
                    </div>
                </div>

                <button class="btn-sair" @click="logout">
                    <Icon name="ph:sign-out-bold" />
                    Sair
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { CHECKOUT_URLS } from "../constants/checkoutLinks";

const { user, logout } = useAuth();
const { checkSubscription } = useSubscription();
const { requestAccess, sending } = useAccessRequest();

const checkoutUrl = ref<string>(CHECKOUT_URLS.main);

const verificando = ref(false);
const mensagemVerificacao = ref("");
const mensagemTipo = ref<"sucesso" | "erro">("erro");
const mostrarSolicitar = ref(false);
const pedidoEnviado = ref(false);

const verificarAcesso = async () => {
    if (!user.value?.email) return;

    verificando.value = true;
    mensagemVerificacao.value = "";
    mostrarSolicitar.value = false;
    pedidoEnviado.value = false;

    try {
        const active = await checkSubscription(user.value.email);

        if (active) {
            mensagemTipo.value = "sucesso";
            mensagemVerificacao.value =
                "Assinatura encontrada! Redirecionando...";
            setTimeout(() => navigateTo("/"), 1500);
        } else {
            mensagemTipo.value = "erro";
            mensagemVerificacao.value =
                "Nenhuma assinatura ativa encontrada para este e-mail.";
            mostrarSolicitar.value = true;
        }
    } catch {
        mensagemTipo.value = "erro";
        mensagemVerificacao.value = "Erro ao verificar. Tente novamente.";
    } finally {
        verificando.value = false;
    }
};

const solicitarLiberacao = async () => {
    if (!user.value?.email) return;
    const ok = await requestAccess(
        user.value.email,
        user.value.name,
        user.value.phone
    );
    if (ok) pedidoEnviado.value = true;
};

const handleCheckoutReturn = async () => {
    if (!user.value?.email || verificando.value) return;
    await verificarAcesso();
};

onMounted(() => {
    window.addEventListener("focus", handleCheckoutReturn);
    window.addEventListener("pageshow", handleCheckoutReturn);
});

onUnmounted(() => {
    window.removeEventListener("focus", handleCheckoutReturn);
    window.removeEventListener("pageshow", handleCheckoutReturn);
});

useHead({ title: "Assinar - Rainha da Bet" });
</script>

<style scoped>
.assinar-page {
    min-height: 100vh;
    background: #0a0a0a;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
}

.container {
    width: 100%;
    max-width: 480px;
}

.card {
    background: #111;
    border: 1px solid #222;
    border-radius: 20px;
    padding: 40px 32px;
    display: flex;
    flex-direction: column;
    gap: 32px;
}

.logo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
}

.crown-icon {
    font-size: 32px;
    color: #fb65a6;
}

.logo h1 {
    font-size: 22px;
    font-weight: 700;
    color: #fff;
}

.content {
    display: flex;
    flex-direction: column;
    gap: 20px;
    text-align: center;
}

.content h2 {
    font-size: 20px;
    font-weight: 700;
    color: #fff;
}

.content > p {
    font-size: 14px;
    color: #888;
    line-height: 1.6;
}

.features {
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: #1a1a1a;
    border: 1px solid #222;
    border-radius: 12px;
    padding: 20px;
    text-align: left;
}

.feature {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    color: #ccc;
}

.feature :deep(svg) {
    font-size: 18px;
    color: #fb65a6;
    flex-shrink: 0;
}

.btn-assinar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 16px 24px;
    background: #fb65a6;
    color: #000;
    font-size: 16px;
    font-weight: 700;
    border-radius: 10px;
    text-decoration: none;
    transition: background 0.2s ease;
}

.btn-assinar:hover {
    background: #e2549a;
}

.checkout-pendente {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 16px;
    background: #1a1a1a;
    border: 1px dashed #333;
    border-radius: 10px;
    color: #666;
    font-size: 14px;
}

.já-comprei {
    font-size: 13px;
    color: #666;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    flex-wrap: wrap;
}

.btn-verificar {
    background: none;
    border: none;
    color: #fb65a6;
    font-size: 13px;
    cursor: pointer;
    text-decoration: underline;
    padding: 0;
}

.btn-verificar:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.mensagem {
    font-size: 13px;
    padding: 12px;
    border-radius: 8px;
}

.mensagem.sucesso {
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.3);
    color: #10b981;
}

.mensagem.erro {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #ef4444;
}

.solicitar-block {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.btn-solicitar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 20px;
    background: transparent;
    border: 1px solid #fb65a6;
    color: #fb65a6;
    font-size: 14px;
    font-weight: 700;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-solicitar:hover:not(:disabled) {
    background: rgba(251, 101, 166, 0.08);
}

.btn-solicitar:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-sair {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    background: transparent;
    border: 1px solid #222;
    border-radius: 8px;
    color: #555;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-sair:hover {
    border-color: #ef4444;
    color: #ef4444;
}
</style>
