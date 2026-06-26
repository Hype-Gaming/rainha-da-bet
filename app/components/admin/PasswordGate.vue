<template>
    <div class="adm-gate">
        <div class="adm-aurora"></div>
        <form class="adm-gate-card adm-fade-up" @submit.prevent="submit">
            <div class="adm-gate-ic">
                <Icon name="ph:crown-bold" />
            </div>
            <h1>Painel Admin</h1>
            <p>Acesso restrito — entre com seu e-mail e senha de administrador.</p>

            <div class="adm-gate-field" :class="{ err: error }">
                <Icon name="ph:envelope-simple-bold" />
                <input
                    ref="emailInput"
                    v-model="email"
                    type="email"
                    placeholder="E-mail"
                    autocomplete="username"
                    @input="error = ''"
                />
            </div>

            <div class="adm-gate-field" :class="{ err: error }">
                <Icon name="ph:key-bold" />
                <input
                    v-model="password"
                    :type="show ? 'text' : 'password'"
                    placeholder="Senha"
                    autocomplete="current-password"
                    @input="error = ''"
                />
                <button type="button" class="adm-gate-eye" tabindex="-1" @click="show = !show">
                    <Icon :name="show ? 'ph:eye-slash-bold' : 'ph:eye-bold'" />
                </button>
            </div>

            <p v-if="error" class="adm-gate-err">
                <Icon name="ph:warning-circle-bold" /> {{ error }}
            </p>

            <button type="submit" class="adm-gate-btn" :disabled="loading || !email || !password">
                <Icon :name="loading ? 'ph:spinner-bold' : 'ph:sign-in-bold'" :class="{ spin: loading }" />
                {{ loading ? "Entrando..." : "Entrar" }}
            </button>

            <NuxtLink to="/" class="adm-gate-back">
                <Icon name="ph:arrow-left-bold" /> Voltar ao app
            </NuxtLink>
        </form>
    </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{ authed: [] }>();

const { login } = useAdmin();

const email = ref("");
const password = ref("");
const show = ref(false);
const loading = ref(false);
const error = ref("");
const emailInput = ref<HTMLInputElement | null>(null);

const submit = async () => {
    if (!email.value || !password.value || loading.value) return;
    loading.value = true;
    error.value = "";
    try {
        await login(email.value.trim(), password.value);
        password.value = "";
        emit("authed");
    } catch {
        error.value = "E-mail ou senha inválidos.";
    } finally {
        loading.value = false;
    }
};

onMounted(() => emailInput.value?.focus());
</script>

<style>
@import "~/assets/css/admin-theme.css";
</style>

<style scoped>
.adm-gate {
    position: fixed;
    inset: 0;
    z-index: 9998;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: var(--adm-bg);
    color: var(--adm-text);
    font-family: "Manrope", sans-serif;
}
.adm-gate-card {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 390px;
    background: var(--adm-panel);
    border: 1px solid var(--adm-border-soft);
    border-radius: 18px;
    padding: 34px 30px;
    text-align: center;
    box-shadow: var(--adm-shadow);
    display: flex;
    flex-direction: column;
    gap: 11px;
}
.adm-gate-ic {
    width: 58px;
    height: 58px;
    margin: 0 auto 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    color: #fff;
    background: var(--adm-grad-accent);
    border-radius: 16px;
    box-shadow: 0 10px 26px rgba(251, 101, 166, 0.35);
}
.adm-gate-card h1 { font-size: 21px; font-weight: 800; margin: 0; letter-spacing: -0.3px; }
.adm-gate-card p { color: var(--adm-muted); font-size: 13.5px; margin: 0 0 6px; line-height: 1.5; }
.adm-gate-field {
    display: flex;
    align-items: center;
    gap: 9px;
    background: var(--adm-bg-2);
    border: 1px solid var(--adm-border-soft);
    border-radius: 11px;
    padding: 12px 14px;
    transition: border-color 0.2s var(--adm-ease);
    text-align: left;
}
.adm-gate-field:focus-within { border-color: var(--adm-accent); }
.adm-gate-field.err { border-color: var(--adm-red); }
.adm-gate-field :deep(svg) { color: var(--adm-faint); flex-shrink: 0; }
.adm-gate-field input {
    background: none; border: none; outline: none; flex: 1; min-width: 0;
    color: var(--adm-text); font-size: 14px; font-family: inherit;
}
.adm-gate-eye { background: none; border: none; cursor: pointer; padding: 0; display: inline-flex; }
.adm-gate-eye:hover :deep(svg) { color: var(--adm-accent); }
.adm-gate-err {
    color: var(--adm-red) !important;
    font-size: 12.5px !important;
    display: flex; align-items: center; gap: 6px; justify-content: center;
    margin: 0 !important;
}
.adm-gate-btn {
    margin-top: 6px;
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    background: var(--adm-grad-accent); color: #1a0410; border: none;
    border-radius: 11px; padding: 13px; font-size: 14.5px; font-weight: 800;
    cursor: pointer; transition: opacity 0.2s, transform 0.15s var(--adm-ease);
}
.adm-gate-btn:hover:not(:disabled) { transform: translateY(-1px); }
.adm-gate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.adm-gate-back {
    margin-top: 8px;
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    color: var(--adm-muted); font-size: 13px; text-decoration: none;
}
.adm-gate-back:hover { color: var(--adm-accent); }
.spin { animation: adm-gate-spin 0.8s linear infinite; }
@keyframes adm-gate-spin { to { transform: rotate(360deg); } }
</style>
