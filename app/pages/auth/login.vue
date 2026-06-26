<template>
    <div class="login-page">
        <div class="login-container">
            <div class="login-header">
                <img src="/logo.png" alt="Rainha da Bet" class="logo" />
                <p class="subtitle">Acesse sua conta</p>
            </div>

            <!-- Informativo -->
            <div class="info-banner">
                <Icon name="ph:info-bold" />
                <span
                    >Use suas credenciais da
                    <strong>esportiva.bet.br</strong> ou
                    <strong>bateu.bet.br</strong></span
                >
            </div>

            <form @submit.prevent="handleLogin" class="login-form">
                <!-- Campo E-mail ou CPF -->
                <div class="form-group">
                    <label for="identifier">
                        <Icon name="ph:user-bold" class="input-icon" />
                        E-mail ou CPF
                    </label>
                    <input
                        id="identifier"
                        v-model="form.identifier"
                        type="text"
                        inputmode="text"
                        autocomplete="username"
                        placeholder="seu@email.com ou CPF"
                        required
                    />
                </div>

                <div class="form-group">
                    <label for="password">
                        <Icon name="ph:lock-bold" class="input-icon" />
                        Senha
                    </label>
                    <div class="password-wrapper">
                        <input
                            id="password"
                            v-model="form.password"
                            :type="showPassword ? 'text' : 'password'"
                            placeholder="Sua senha"
                            required
                        />
                        <button
                            type="button"
                            class="toggle-password"
                            @click="showPassword = !showPassword"
                        >
                            <Icon
                                :name="
                                    showPassword
                                        ? 'ph:eye-slash-bold'
                                        : 'ph:eye-bold'
                                "
                            />
                        </button>
                    </div>
                </div>

                <!-- Mensagem de erro -->
                <div v-if="errorMessage" class="error-message">
                    <Icon name="ph:warning-circle-bold" />
                    {{ errorMessage }}
                </div>

                <button type="submit" class="btn-login" :disabled="loading">
                    <Icon v-if="loading" name="ph:spinner" class="spinner" />
                    <span v-if="loading">Entrando...</span>
                    <span v-else>Entrar</span>
                </button>
            </form>

            <div class="login-footer">
                <p>Não possui uma conta?</p>
                <div class="create-links">
                    <a
                        v-for="brand in brands"
                        :key="brand.slug"
                        :href="brand.affiliateUrl"
                        target="_blank"
                        class="create-link"
                    >
                        <Icon name="ph:plus-circle-bold" />
                        Criar conta na {{ brand.name }}
                    </a>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { BRANDS } from "../../../shared/brands";

definePageMeta({
    layout: "default",
});

const brands = BRANDS;

const { login, loading, error, isAuthenticated } = useAuth();

const errorMessage = ref("");
const showPassword = ref(false);

const form = reactive({
    identifier: "",
    password: "",
});

// Redirecionar se já estiver autenticado
onMounted(() => {
    if (isAuthenticated.value) {
        navigateTo("/");
    }
});

const handleLogin = async () => {
    errorMessage.value = "";

    const identifier = form.identifier.trim();
    if (!identifier) {
        errorMessage.value = "Digite seu e-mail ou CPF";
        return;
    }

    // Detecta automaticamente: com "@" é e-mail; senão, trata como CPF.
    const isEmail = identifier.includes("@");

    const result = await login(
        isEmail
            ? { email: identifier, password: form.password }
            : { cpf: identifier, password: form.password },
    );

    if (result.success) {
        navigateTo("/");
    } else {
        errorMessage.value = result.message || "Erro ao fazer login";
    }
};
</script>

<style scoped>
.login-page {
    min-height: 100vh;
    background-color: #000000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.login-container {
    width: 100%;
    max-width: 420px;
    padding: 40px;
    background-color: #111111;
    border-radius: 16px;
    border: 1px solid #222222;
    box-shadow: 0 20px 60px rgba(251, 101, 166, 0.1);
}

.login-header {
    text-align: center;
    margin-bottom: 32px;
}

.logo {
    max-width: 220px;
    height: auto;
    margin: 0 0 16px 0;
}

.subtitle {
    color: #888888;
    font-size: 16px;
    margin: 0;
}

.login-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.login-type-toggle {
    display: flex;
    gap: 8px;
    background: #1a1a1a;
    border-radius: 10px;
    padding: 4px;
}

.toggle-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 16px;
    background: transparent;
    border: none;
    border-radius: 8px;
    color: #888;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
}

.toggle-btn:hover {
    color: #fff;
}

.toggle-btn.active {
    background: linear-gradient(135deg, #fb65a6 0%, #fb65a6 100%);
    color: #000;
}

.toggle-btn :deep(svg) {
    font-size: 16px;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.form-group label {
    color: #cccccc;
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
}

.input-icon {
    font-size: 16px;
    color: #fb65a6;
}

.form-group input[type="email"],
.form-group input[type="password"],
.form-group input[type="text"] {
    width: 100%;
    padding: 14px 16px;
    background-color: #1a1a1a;
    border: 1px solid #333333;
    border-radius: 10px;
    color: #ffffff;
    font-size: 15px;
    transition: all 0.3s ease;
    outline: none;
}

.form-group input[type="email"]:focus,
.form-group input[type="password"]:focus,
.form-group input[type="text"]:focus {
    border-color: #fb65a6;
    box-shadow: 0 0 0 3px rgba(251, 101, 166, 0.15);
}

.form-group input::placeholder {
    color: #555555;
}

.password-wrapper {
    position: relative;
    width: 100%;
}

.password-wrapper input {
    padding-right: 48px;
}

.toggle-password {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #666;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
}

.toggle-password:hover {
    color: #fb65a6;
}

.toggle-password :deep(svg) {
    font-size: 20px;
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
}

.error-message :deep(svg) {
    font-size: 18px;
    flex-shrink: 0;
}

.link {
    color: #fb65a6;
    text-decoration: none;
    font-size: 14px;
    transition: opacity 0.2s ease;
}

.link:hover {
    opacity: 0.8;
    text-decoration: underline;
}

.btn-login {
    width: 100%;
    padding: 16px;
    background: linear-gradient(135deg, #fb65a6 0%, #fb65a6 100%);
    border: none;
    border-radius: 10px;
    color: #000000;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    margin-top: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
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

.btn-login:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(251, 101, 166, 0.35);
}

.btn-login:active:not(:disabled) {
    transform: translateY(0);
}

.btn-login:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.login-footer {
    text-align: center;
    margin-top: 28px;
    padding-top: 24px;
    border-top: 1px solid #222222;
}

.login-footer p {
    color: #888888;
    font-size: 14px;
    margin: 0 0 14px 0;
}

.create-links {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.create-link {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 16px;
    background: rgba(251, 101, 166, 0.08);
    border: 1px solid rgba(251, 101, 166, 0.35);
    border-radius: 10px;
    color: #fb65a6;
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.2s ease;
}

.create-link:hover {
    background: rgba(251, 101, 166, 0.15);
    border-color: #fb65a6;
}

.create-link :deep(svg) {
    font-size: 18px;
}

.info-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(251, 101, 166, 0.1);
    border: 1px solid rgba(251, 101, 166, 0.3);
    border-radius: 10px;
    padding: 12px 16px;
    margin-bottom: 20px;
}

.info-banner :deep(svg) {
    color: #fb65a6;
    font-size: 18px;
    flex-shrink: 0;
}

.info-banner span {
    color: #aaa;
    font-size: 13px;
    line-height: 1.4;
}

.info-banner strong {
    color: #fb65a6;
}

/* Responsividade */
@media (max-width: 480px) {
    .login-container {
        padding: 28px 20px;
    }

    .logo {
        font-size: 24px;
    }

    .form-group input[type="email"],
    .form-group input[type="password"] {
        padding: 12px 14px;
        font-size: 14px;
    }

    .btn-login {
        padding: 14px;
        font-size: 15px;
    }

    .form-options {
        flex-direction: column;
        gap: 12px;
        align-items: flex-start;
    }
}
</style>
