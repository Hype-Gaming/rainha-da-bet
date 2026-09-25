<template>
    <div class="dashboard" :style="tenantStyle">
        <!-- Header -->
        <header class="header">
            <div class="header-left">
                <NuxtLink to="/">
                    <img
                        src="/logo.png"
                        alt="Rainha da Bet"
                        class="header-logo"
                    />
                </NuxtLink>
            </div>
            <div class="header-right">
                <div class="balance">
                    <Icon name="ph:wallet-bold" class="balance-icon" />
                    <span class="balance-value">{{ formattedBalance }}</span>
                    <Icon
                        name="ph:info"
                        class="balance-info"
                        @click="openWallet"
                    />
                </div>
                <button class="btn-deposit" @click="handleDepositClick">
                    DEPOSITAR
                </button>
                <div class="profile-wrapper">
                    <div class="profile-icon" @click="toggleProfileDropdown">
                        <Icon name="ph:user-bold" />
                    </div>
                    <div class="profile-dropdown" v-if="showProfileDropdown">
                        <div class="dropdown-user" v-if="user">
                            <span class="user-name">{{
                                user?.name || "Usuário"
                            }}</span>
                            <span class="user-email">{{
                                user?.email || ""
                            }}</span>
                        </div>
                        <NuxtLink to="/gestao" class="dropdown-item" @click="guardRoute">
                            <Icon name="ph:calculator-bold" />
                            Gestão
                        </NuxtLink>
                        <NuxtLink to="/aulas" class="dropdown-item" @click="guardRoute">
                            <Icon name="ph:graduation-cap-bold" />
                            Aulas
                        </NuxtLink>
                        <button
                            v-if="isAuthenticated"
                            @click="handleLogout"
                            class="dropdown-item logout"
                        >
                            <Icon name="ph:sign-out-bold" />
                            <span>Sair</span>
                        </button>
                        <button v-else class="dropdown-item" @click="redirectToLogin">
                            <Icon name="ph:sign-in-bold" />
                            <span>Entrar</span>
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <nav class="member-shortcuts" aria-label="Recursos principais">
            <NuxtLink
                v-for="shortcut in homeConfig.shortcuts"
                :key="shortcut.label"
                :to="shortcut.href"
                :external="shortcut.external"
                :target="shortcut.external ? '_blank' : undefined"
                :rel="shortcut.external ? 'noopener noreferrer' : undefined"
                class="member-shortcut"
                @click="handleShortcutClick($event, shortcut)"
            >
                <span><img v-if="shortcutImage(shortcut)" :src="shortcutImage(shortcut)" :alt="shortcut.label"><Icon v-else :name="shortcut.icon" /></span>
                {{ shortcut.label }}
            </NuxtLink>
        </nav>

        <div class="home-extras">
            <a :href="homeConfig.liveHref" target="_blank" rel="noopener noreferrer" class="live">
                <i /><div><small>AO VIVO</small><strong>{{ homeConfig.liveTitle }}</strong></div><span>{{ homeConfig.liveAt }}</span><b>Entrar <Icon name="ph:arrow-right-bold" /></b>
            </a>
            <section class="xp" aria-label="Progresso">
                <div><span>{{ homeConfig.xpLabel }}</span><strong>{{ homeConfig.xpCurrent }} / {{ homeConfig.xpGoal }} XP</strong></div>
                <div class="track" role="progressbar" aria-label="Progresso de XP" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="xpPercent"><i :style="{ width: xpPercent + '%' }" /></div>
            </section>
            <div class="community"><span><Icon name="ph:users-three-bold" /><strong>{{ homeConfig.members.toLocaleString('pt-BR') }}</strong> membros</span><span><i /><strong>{{ homeConfig.playingNow }}</strong> jogando agora</span></div>
        </div>

        <!-- Main Content -->
        <div class="main-content">
            <!-- Center Content -->
            <div class="center-content">
                <!-- Destaque: vídeo ou carrossel -->
                <section v-if="heroVideoSrc" class="hero-video" aria-label="Vídeo de destaque">
                    <video :src="heroVideoSrc" :poster="banners[0]?.image" controls playsinline preload="metadata" />
                </section>
                <section v-else-if="banners.length" class="banners" aria-label="Destaques">
                    <div ref="bannerTrack" class="banner-track" @scroll.passive="onBannerScroll">
                        <a
                            v-for="(banner, index) in banners"
                            :key="index"
                            :href="banner.href"
                            :target="banner.external ? '_blank' : undefined"
                            :rel="banner.external ? 'noopener noreferrer' : undefined"
                            class="banner-slide"
                        ><img :src="banner.image" :alt="`Banner ${index + 1}`"></a>
                    </div>
                    <div v-if="banners.length > 1" class="dots" aria-hidden="true"><i v-for="(_, index) in banners" :key="index" :class="{ on: index === activeBanner }" /></div>
                </section>

                <!-- IA Prime -->
                <div id="games" class="games-section">
                    <div class="games-header">
                        <h2 class="games-title">
                            <Icon
                                name="ph:sparkle-bold"
                                class="title-icon"
                            />
                            Inteligência Artificial Prime
                        </h2>
                    </div>
                    <div class="games-grid">
                        <a
                            v-for="(game, index) in primeGames"
                            :key="index"
                            :href="game.href"
                            class="game-card"
                            @click="handleFreeGameClick"
                        >
                            <div class="game-image">
                                <img
                                    :src="game.image"
                                    :alt="game.name"
                                    v-if="game.image"
                                />
                            </div>
                            <div class="game-info">
                                <h3 class="game-name">{{ game.name }}</h3>
                                <span
                                    class="game-provider"
                                    v-if="game.provider"
                                >
                                    <Icon
                                        name="ph:play-fill"
                                        class="provider-icon"
                                    />
                                    {{ game.provider }}
                                </span>
                            </div>
                        </a>
                    </div>
                </div>

                <!-- IA Premium -->
                <div class="games-section premium-section">
                    <div class="games-header">
                        <h2 class="games-title">
                            <Icon
                                name="ph:crown-bold"
                                class="title-icon title-icon-premium"
                            />
                            Inteligência Artificial Premium
                        </h2>
                    </div>
                    <div class="games-grid">
                        <a
                            v-for="(game, index) in premiumGames"
                            :key="index"
                            :href="isSubscribed ? `/jogo/${game.id}` : checkoutUrl"
                            :target="isSubscribed ? '_self' : '_blank'"
                            rel="noopener noreferrer"
                            class="game-card card-premium-locked"
                            :class="{ 'is-locked': !isPaid }"
                            @click="handleLockedGameClick($event, game.id)"
                        >
                            <div class="game-image">
                                <img
                                    :src="game.image"
                                    :alt="game.name"
                                    v-if="game.image"
                                />
                                <div v-if="!isPaid" class="permanent-lock premium-lock">
                                    <Icon name="ph:lock-key-fill" class="permanent-lock-icon" />
                                </div>
                            </div>
                            <div class="game-info">
                                <h3 class="game-name">{{ game.name }}</h3>
                                <span v-if="!isPaid" class="game-provider game-unlock">
                                    <Icon name="ph:lock-bold" class="provider-icon" />
                                    Desbloquear acesso
                                </span>
                                <span v-else class="game-provider game-unlocked">
                                    <Icon name="ph:play-fill" class="provider-icon" />
                                    Acessar agora
                                </span>
                            </div>
                        </a>
                    </div>
                </div>

                <!-- IA Claude -->
                <div class="games-section claude-section">
                    <div class="games-header">
                        <h2 class="games-title">
                            <Icon
                                name="ph:lightning-fill"
                                class="title-icon title-icon-claude"
                            />
                            IA Claude – Operações Sem Gale
                        </h2>
                    </div>
                    <div class="games-grid">
                        <a
                            v-for="(game, index) in claudeGames"
                            :key="index"
                            :href="isSubscribed ? `/jogo/${game.id}` : game.checkoutUrl"
                            :target="isSubscribed ? '_self' : '_blank'"
                            rel="noopener noreferrer"
                            class="game-card card-claude-locked"
                            :class="{ 'is-locked': !isPaid }"
                            @click="handleLockedGameClick($event, game.id)"
                        >
                            <div class="game-image">
                                <img
                                    :src="game.image"
                                    :alt="game.name"
                                    v-if="game.image"
                                />
                                <div v-if="!isPaid" class="permanent-lock claude-lock">
                                    <Icon name="ph:lock-key-fill" class="permanent-lock-icon" />
                                </div>
                            </div>
                            <div class="game-info">
                                <h3 class="game-name">{{ game.name }}</h3>
                                <span v-if="!isPaid" class="game-provider game-unlock">
                                    <Icon name="ph:lock-bold" class="provider-icon" />
                                    Desbloquear acesso
                                </span>
                                <span v-else class="game-provider game-unlocked">
                                    <Icon name="ph:play-fill" class="provider-icon" />
                                    Acessar agora
                                </span>
                            </div>
                        </a>
                    </div>
                </div>

                <!-- Central do piloto -->
                <div class="links-section connection-section">
                    <header class="connection-head">
                        <div><small>CENTRAL DO PILOTO</small><h2>Conecte-se. Opere melhor.</h2></div>
                        <p>Conteúdo, alertas e aprendizado para você evoluir todos os dias.</p>
                    </header>
                    <div class="links-grid">
                        <NuxtLink
                            v-for="(link, index) in homeConfig.connectionLinks"
                            :key="index"
                            :to="link.external ? link.href : link.href || '#'"
                            :href="link.external ? link.href : undefined"
                            :target="link.external ? '_blank' : undefined"
                            :rel="link.external ? 'noopener noreferrer' : undefined"
                            :external="link.external"
                            class="link-card"
                            @click="handleUsefulLinkClick($event, link)"
                        >
                            <span class="connection-icon"><Icon :name="link.icon" /></span>
                            <span class="connection-text"><em>{{ link.external ? 'CONECTE-SE' : 'APRENDA AGORA' }}</em><strong>{{ link.label }}</strong><small>{{ link.description || "Acesse agora" }}</small></span>
                            <Icon name="ph:arrow-up-right-bold" class="connection-arrow" />
                        </NuxtLink>
                    </div>
                </div>

                <!-- Destaques -->
                <div class="highlights-section">
                    <div class="highlights-header">
                        <h2 class="section-title">Destaques</h2>
                        <div class="highlights-nav">
                            <button class="nav-btn">
                                <Icon name="ph:caret-left-bold" />
                            </button>
                            <button class="nav-btn">
                                <Icon name="ph:caret-right-bold" />
                            </button>
                        </div>
                    </div>
                    <div class="highlights-grid">
                        <NuxtLink
                            :to="highlight.href || '#'"
                            class="highlight-card"
                            v-for="(highlight, index) in highlights"
                            :key="index"
                            @click="guardRoute"
                        >
                            <img :src="highlight.image" :alt="highlight.name" />
                        </NuxtLink>
                    </div>
                </div>
            </div>
        </div>

        <section class="responsible"><Icon name="ph:shield-check-bold" /><div><strong>Jogue com responsabilidade</strong><p>Defina seus limites. Jogar deve ser sempre uma forma de entretenimento.</p></div></section>

        <nav class="bottom-nav" aria-label="Navegação principal">
            <NuxtLink to="/" class="active"><Icon name="ph:house-fill" /><span>Início</span></NuxtLink>
            <a href="#games"><Icon name="ph:game-controller-bold" /><span>Jogos</span></a>
            <button type="button" @click="openWallet"><Icon name="ph:wallet-bold" /><span>Carteira</span></button>
            <NuxtLink to="/torneio"><Icon name="ph:trophy-bold" /><span>Torneio</span></NuxtLink>
            <NuxtLink to="/gestao"><Icon name="ph:user-circle-bold" /><span>Perfil</span></NuxtLink>
        </nav>

        <!-- Convite de notificações push (pop-up, uma vez por sessão) -->
        <Teleport to="body">
            <div v-if="pushModalOpen" class="push-overlay" @click.self="pushModalOpen = false" @keydown.esc="pushModalOpen = false">
                <section ref="pushDialog" class="push-modal" role="dialog" aria-modal="true" aria-labelledby="push-title" tabindex="-1">
                    <button class="push-close" aria-label="Fechar convite de notificações" @click="pushModalOpen = false"><Icon name="ph:x-bold" /></button>
                    <div class="push-modal-icon"><Icon name="ph:bell-ringing-bold" /></div>
                    <h2 id="push-title">Ativar notificações</h2>
                    <p v-if="pushError" class="push-modal-error" role="alert">{{ pushError }}</p>
                    <p v-else>Receba avisos e sinais em primeira mão.</p>
                    <button class="push-modal-cta" :disabled="pushLoading" @click="handleEnablePush">
                        <Icon :name="pushLoading ? 'ph:spinner-bold' : 'ph:bell-ringing-bold'" /> Ativar agora
                    </button>
                    <button class="push-modal-later" @click="pushModalOpen = false">Agora não</button>
                </section>
            </div>
        </Teleport>

        <!-- Deposit Modal -->
        <DepositModal />
        <IntroVideoModal />
        <RouletteInitialModal v-model="rouletteInviteOpen" />

        <Teleport to="body">
            <div v-if="walletOpen" class="wallet-overlay" @click.self="walletOpen = false" @keydown.esc="walletOpen = false">
                <section class="wallet-modal" role="dialog" aria-modal="true" aria-labelledby="wallet-title">
                    <button class="wallet-close" aria-label="Fechar carteira" @click="walletOpen = false"><Icon name="ph:x-bold" /></button>
                    <div class="wallet-icon"><Icon name="ph:wallet-bold" /></div>
                    <p id="wallet-title" class="wallet-label">MINHA CARTEIRA</p>
                    <strong class="wallet-balance">{{ formattedBalance }}</strong>
                    <div class="wallet-actions">
                        <button class="wallet-deposit" @click="walletOpen = false; handleDepositClick()"><Icon name="ph:plus-bold" /> Depositar</button>
                        <button class="wallet-withdraw" @click="withdraw"><Icon name="ph:arrow-up-right-bold" /> Sacar</button>
                    </div>
                    <span class="wallet-hint"><Icon name="ph:info-bold" /> O saque é concluído com segurança na plataforma da casa.</span>
                </section>
            </div>
        </Teleport>

        <!-- Subscription Modal -->
        <!-- Pop-up de desbloqueio de assinatura desativado a pedido (será removido).
             Usuários não pagos agora vão direto para a Lastlink ao clicar em jogo pago. -->
        <!-- <SubscriptionModal /> -->

        <!-- Grupo VIP Modal -->
        <Teleport to="body">
            <div
                v-if="showGrupoModal"
                class="grupo-modal-overlay"
                @click="closeGrupoModal"
            >
                <div class="grupo-modal" role="dialog" aria-modal="true" :aria-labelledby="'campaign-title'" @click.stop>
                    <button ref="campaignClose" class="grupo-modal-close" aria-label="Fechar campanha" @click="closeGrupoModal">
                        <Icon name="ph:x-bold" />
                    </button>
                    <a
                        :href="memberExperience.campaignLink"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="grupo-banner-link"
                        @click="closeGrupoModal"
                    >
                        <img
                            :src="memberExperience.campaignImage"
                            :alt="memberExperience.campaignTitle"
                            class="grupo-banner-img"
                        />
                        <span class="campaign-copy"><strong id="campaign-title">{{ memberExperience.campaignTitle }}</strong><small>{{ memberExperience.campaignMessage }}</small></span>
                    </a>
                </div>
            </div>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import { CHECKOUT_URLS } from "../constants/checkoutLinks";
import { getBrand } from "../../shared/brands";

definePageMeta({
    layout: "default",
});

const { user, logout, isAuthenticated, formattedBalance, fetchUserProfile, brandSlug } =
    useAuth();
const { memberExperience, refreshMemberExperience } = useMemberExperience();
const tenantStyle = computed(() => ({ "--tenant-primary": memberExperience.primaryColor }));
const { openModal: openDepositModal } = useDeposit();
const {
    isSubscribed,
    isPaid,
    init: initSubscription,
} = useSubscription();

const checkoutUrl = CHECKOUT_URLS.main;
const socialLinks = {
    whatsapp: "https://chat.whatsapp.com/LtELxASK4F07hY2GShxVAv?s=cl&p=i&ilr=1",
    instagram: "https://www.instagram.com/mariainvest_/",
    telegram: "https://t.me/+bL3Px9mB3oJkNzdh",
};

const refreshSubscriptionAccess = async (force = false) => {
    if (!isAuthenticated.value) return;
    await initSubscription(user.value?.email || null, { force });
};

const handleWindowFocus = () => {
    refreshSubscriptionAccess(true);
};

// Notificações push (web push)
const {
    permission: pushPermission,
    isSubscribed: pushSubscribed,
    loading: pushLoading,
    error: pushError,
    checked: pushChecked,
    refresh: refreshPush,
    subscribe: subscribePush,
} = usePush();

// Botão de ativar: aparece quando a permissão permite pedir (default/granted) e
// ainda não está inscrito. Só decide depois que o primeiro refresh() já rodou
// (pushChecked), senão o estado inicial (default/não inscrito) pisca na tela
// antes do valor real chegar.
const showPushPrompt = computed(
    () =>
        pushChecked.value &&
        (pushPermission.value === "default" ||
            pushPermission.value === "granted") &&
        !pushSubscribed.value,
);

// Permissão bloqueada de vez pelo navegador: mostra instruções de desbloqueio.
const pushBlocked = computed(
    () => pushChecked.value && pushPermission.value === "denied",
);

const pushModalOpen = ref(false);
const pushDialog = ref<HTMLElement | null>(null);
// Abre uma vez por sessão, depois dos outros pop-ups; fecha sozinho quando a inscrição conclui.
watchEffect(() => {
    if (!showPushPrompt.value) {
        pushModalOpen.value = false;
        return;
    }
    if (!isAuthenticated.value || rouletteInviteOpen.value || showGrupoModal.value || sessionStorage.getItem("push_invite_seen")) return;
    sessionStorage.setItem("push_invite_seen", "1");
    pushModalOpen.value = true;
    nextTick(() => pushDialog.value?.focus());
});

const handleEnablePush = async () => {
    await subscribePush(user.value?.email || null);
};

// Atualizar balance e verificar assinatura ao montar a página
onMounted(async () => {
    await Promise.all([refreshMemberExperience(), loadHomeConfig()]);
    if (isAuthenticated.value) await intro.autoOpen();
    if (memberExperience.campaignEnabled && !sessionStorage.getItem("member_campaign_seen")) {
        showGrupoModal.value = true;
        sessionStorage.setItem("member_campaign_seen", "1");
        await nextTick();
        campaignClose.value?.focus();
    }
    if (isAuthenticated.value) {
        fetchUserProfile();
    }
    maybeInviteRoulette();
    refreshSubscriptionAccess();
    refreshPush(user.value?.email || null);

    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("pageshow", handleWindowFocus);
});

const { homeConfig, loadHomeConfig } = useHomeConfig();
const intro = useIntroVideo();
const banners = computed(() => homeConfig.value.banners.filter((b) => b.image));
const heroVideoSrc = computed(() => {
    const v = homeConfig.value.heroVideo?.trim();
    return v && /^(https?:)?\//.test(v) ? v : "";
});
const bannerTrack = ref<HTMLElement | null>(null);
const activeBanner = ref(0);
const onBannerScroll = () => {
    const el = bannerTrack.value;
    if (el) activeBanner.value = Math.round(el.scrollLeft / el.clientWidth);
};
const showProfileDropdown = ref(false);

const toggleProfileDropdown = () => {
    if (!isAuthenticated.value) {
        redirectToLogin();
        return;
    }
    showProfileDropdown.value = !showProfileDropdown.value;
};

const redirectToLogin = () => {
    showProfileDropdown.value = false;
    return navigateTo("/auth/login");
};

const requireAuth = (event?: Event) => {
    if (isAuthenticated.value) return true;
    event?.preventDefault();
    redirectToLogin();
    return false;
};

const handleFreeGameClick = (event: Event) => {
    if (!requireAuth(event)) return;
    if (intro.required.value) {
        event.preventDefault();
        intro.show();
    }
};
const walletOpen = ref(false);
const openWallet = () => {
    if (!isAuthenticated.value) return redirectToLogin();
    walletOpen.value = true;
};
const withdraw = () => window.open(getBrand(brandSlug.value).withdrawUrl, "_blank", "noopener,noreferrer");
const guardRoute = (event: Event) => {
    requireAuth(event);
};

const shortcutImage = (s: { image?: string; icon: string }) =>
    s.image || (/^(https?:\/\/|\/)/.test(s.icon) ? s.icon : "");
const handleShortcutClick = (event: Event, s: { href: string; external?: boolean }) => {
    if (!s.external && !["/torneio", "/torneios", "/loja"].includes(s.href)) requireAuth(event);
};

const handleDepositClick = () => {
    if (!requireAuth()) return;
    openDepositModal();
};

const handleSubscriptionClick = () => {
    if (!requireAuth()) return;
    window.open(checkoutUrl, "_blank", "noopener,noreferrer");
};

const handleNewsClick = (event: Event, news: { href?: string; external?: boolean }) => {
    if (news.external) return;

    const href = news.href || "#";
    if (href === "#") {
        event.preventDefault();
    }

    requireAuth(event);
};

const handleUsefulLinkClick = (event: Event, link: { href?: string; external?: boolean }) => {
    if (link.external) return;

    const href = link.href || "#";
    if (href === "#") {
        event.preventDefault();
    }

    requireAuth(event);
};

// Fechar dropdown ao clicar fora
const closeDropdown = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest(".profile-wrapper")) {
        showProfileDropdown.value = false;
    }
};

const handleLogout = async () => {
    showProfileDropdown.value = false;
    await logout();
};

let bannerTimer: ReturnType<typeof setInterval> | undefined;
// Auto-slide every 5 seconds
onMounted(() => {
    bannerTimer = setInterval(() => {
        const el = bannerTrack.value;
        if (el && banners.value.length > 1) el.scrollTo({ left: ((activeBanner.value + 1) % banners.value.length) * el.clientWidth, behavior: "smooth" });
    }, 5000);
    document.addEventListener("click", closeDropdown);
});

onUnmounted(() => {
    clearInterval(bannerTimer);
    document.body.style.overflow = "";
    document.removeEventListener("click", closeDropdown);
    window.removeEventListener("focus", handleWindowFocus);
    window.removeEventListener("pageshow", handleWindowFocus);
});

const newsItems = ref([
    {
        title: "Nova estratégia liberada",
        description:
            "Entrou no ar uma nova estratégia para o jogo Evolution Gaming!",
        icon: "ph:lightning-bold",
        href: "#",
    },
    {
        title: "Novo Canal de Lives",
        description:
            "Confira o novo canal de lives com análises em tempo real.",
        icon: "ph:video-camera-bold",
        href: socialLinks.telegram,
        external: true,
    },
    {
        title: "Atualização nas odds",
        description:
            "Veja o novo ajuste nas odds do Evolution Gaming. Aproveite!",
        icon: "ph:chart-line-up-bold",
        href: "#",
    },
    {
        title: "Comunidade WhatsApp",
        description: "Participe da nossa comunidade exclusiva no WhatsApp.",
        icon: "ph:whatsapp-logo-bold",
        href: socialLinks.whatsapp,
        external: true,
    },
    {
        title: "Aprenda a Operar",
        description: "Confira as melhores estratégias para começar a operar.",
        icon: "ph:graduation-cap-bold",
        href: "/aulas",
    },
]);

const primeGames = ref([
    {
        id: "football-studio",
        name: "FOOTBALL STUDIO",
        provider: "Evolution",
        image: "/games/football-studio.png",
        href: "/jogo/football-studio",
    },
    {
        id: "futebol-brasileiro",
        name: "FUTEBOL BRASILEIRO SPORTS CLUB",
        provider: "GoodGame",
        image: "/games/football-studio-br.png",
        href: "/jogo/futebol-brasileiro",
    },
]);

const premiumGames = ref([
    {
        id: "bac-bo-en",
        name: "BAC BO EN",
        image: "/games/bac-bo-en.png",
    },
    {
        id: "bac-bo-brasileiro",
        name: "BAC BO BRASILEIRO",
        image: "/games/bac-bo-ao-vivo.png",
    },
    {
        id: "football-studio-ao-vivo",
        name: "FUTEBOL STUDIO AO VIVO",
        image: "/games/football-studio-br.png",
    },
    {
        id: "football-studio",
        name: "FOOTBALL STUDIO",
        image: "/games/football-studio.png",
    },
    {
        id: "baccarat",
        name: "BACCARAT",
        image: "/games/baccarat.png",
    },
    {
        id: "dragon-tiger",
        name: "DRAGON TIGER",
        image: "/games/dragon-tiger.png",
    },
    {
        id: "aviator",
        name: "AVIATOR",
        image: "/games/aviator.png",
    },
]);

const claudeGames = ref([
    {
        id: "football-studio-en",
        name: "FOOTBALL STUDIO ENGLISH",
        image: "/games/football-studio.png",
        checkoutUrl: CHECKOUT_URLS.legacySemGale,
    },
]);

const xpPercent = computed(() => Math.min(100, (homeConfig.value.xpCurrent / Math.max(1, homeConfig.value.xpGoal)) * 100));
const rouletteInviteOpen = ref(false);
const maybeInviteRoulette = () => {
    if (!isAuthenticated.value || showGrupoModal.value || intro.state.open || sessionStorage.getItem("roulette_invite_seen")) return;
    sessionStorage.setItem("roulette_invite_seen", "1");
    rouletteInviteOpen.value = true;
};
const showGrupoModal = ref(false);
const campaignClose = ref<HTMLButtonElement | null>(null);
const openGrupoModal = () => {
    showGrupoModal.value = true;
};
const closeGrupoModal = () => {
    showGrupoModal.value = false;
};

watch(showGrupoModal, (open) => {
    document.body.style.overflow = open ? "hidden" : "";
    if (!open) maybeInviteRoulette();
});

const handleLockedGameClick = (event: MouseEvent, gameId: string) => {
    event.preventDefault();

    if (!requireAuth(event)) return;

    if (isSubscribed.value) {
        navigateTo(`/jogo/${gameId}`);
        return;
    }

    const game = claudeGames.value.find((item) => item.id === gameId);
    const lockedCheckoutUrl = game?.checkoutUrl || checkoutUrl;
    window.open(lockedCheckoutUrl, "_blank", "noopener,noreferrer");
};

const usefulLinks = ref([
    {
        name: "Gestão de Banca",
        icon: "ph:calculator-bold",
        active: false,
        href: "/gestao",
    },
    {
        name: "Aulas",
        icon: "ph:graduation-cap-bold",
        active: false,
        href: "/aulas",
    },
    {
        name: "WhatsApp",
        icon: "ph:whatsapp-logo-bold",
        active: false,
        href: socialLinks.whatsapp,
        external: true,
    },
    {
        name: "Instagram",
        icon: "ph:instagram-logo-bold",
        active: false,
        href: socialLinks.instagram,
        external: true,
    },
    {
        name: "Telegram",
        icon: "ph:telegram-logo-bold",
        active: false,
        href: socialLinks.telegram,
        external: true,
    },
]);

const highlights = ref([
    { name: "Aprenda a Operar", image: "/cards/operar.png", href: "/aulas" },
    {
        name: "Gestão de Banca",
        image: "/cards/gestaodebanca.png",
        href: "/gestao",
    },
]);
</script>

<style scoped>
.dashboard {
    min-height: 100vh;
    background-color: #0a0a0a;
    color: #ffffff;
}

/* Header */
.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 24px;
    background-color: #111111;
    border-bottom: 1px solid #222222;
    position: sticky;
    top: 0;
    z-index: 100;
}

.header-logo {
    height: 40px;
    width: auto;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 16px;
}

.balance {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background-color: #1a1a1a;
    border-radius: 8px;
    border: 1px solid #333333;
}

.balance-icon {
    font-size: 18px;
    color: #fb65a6;
}

.balance-value {
    color: #fb65a6;
    font-weight: 600;
}

.balance-info {
    font-size: 16px;
    color: #666666;
    cursor: pointer;
    transition: color 0.2s;
}

.balance-info:hover {
    color: #fb65a6;
}

.btn-deposit {
    padding: 12px 24px;
    background: linear-gradient(135deg, #fb65a6 0%, #fb65a6 100%);
    border: none;
    border-radius: 8px;
    color: #000000;
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn-deposit:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(251, 101, 166, 0.4);
}

.profile-wrapper {
    position: relative;
}

.profile-icon {
    width: 42px;
    height: 42px;
    background: linear-gradient(135deg, #fb65a6 0%, #fb65a6 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 18px;
    transition: transform 0.2s ease;
}

.profile-icon:hover {
    transform: scale(1.05);
}

.profile-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 8px;
    min-width: 160px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    z-index: 200;
    animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-8px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.dropdown-user {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 12px 16px;
    border-bottom: 1px solid #333;
}

.user-name {
    font-size: 14px;
    font-weight: 600;
    color: #fff;
}

.user-email {
    font-size: 12px;
    color: #888;
}

.dropdown-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    color: #fff;
    text-decoration: none;
    font-size: 14px;
    transition: background 0.2s ease;
    background: none;
    border: none;
    width: 100%;
    cursor: pointer;
}

.dropdown-item:hover {
    background: #222;
}

.dropdown-item.logout {
    color: #ef4444;
}

.dropdown-item.logout:hover {
    background: rgba(239, 68, 68, 0.1);
}

/* Main Content */
.main-content {
    display: flex;
    padding: 24px;
    gap: 24px;
}

.member-shortcuts {
    max-width: 1380px;
    margin: 18px auto 0;
    padding: 0 24px 6px;
    display: flex;
    justify-content: flex-start;
    align-items: flex-start;
    gap: 14px;
    overflow-x: auto;
}

.member-shortcut {
    width: 72px;
    flex: 0 0 72px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 7px;
    color: #ddd;
    font-size: 12px;
    text-decoration: none;
    text-align: center;
}

.member-shortcut > span {
    width: 60px;
    height: 60px;
    display: grid;
    place-items: center;
    border: 1px solid #ffffff1a;
    border-radius: 50%;
    color: #fff;
    font-size: 25px;
    background: linear-gradient(145deg, #1d1d1d, #121212);
    transition: color .2s, border-color .2s, box-shadow .2s;
}

.member-shortcut:hover > span,
.member-shortcut:focus-visible > span {
    color: var(--tenant-primary, #fb65a6);
    border-color: var(--tenant-primary, #fb65a6);
    box-shadow: 0 0 18px color-mix(in srgb, var(--tenant-primary, #fb65a6) 18%, transparent);
}

.member-shortcut:focus-visible { outline: none; }
.member-shortcut > span { overflow: hidden; }
.member-shortcut > span img { width: 100%; height: 100%; object-fit: cover; }

@media (max-width: 850px) {
    .member-shortcuts { padding-inline: 16px; gap: 8px; }
    .member-shortcut { width: 68px; flex-basis: 68px; }
    .member-shortcut > span { width: 56px; height: 56px; }
}

/* Sidebar */
.sidebar {
    width: 280px;
    flex-shrink: 0;
}

.btn-confirmar-compra {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 12px 16px;
    background: rgba(251, 101, 166, 0.08);
    border: 1px solid rgba(251, 101, 166, 0.3);
    border-radius: 10px;
    color: #fb65a6;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    margin-bottom: 20px;
    transition: all 0.2s ease;
}

.btn-confirmar-compra:hover {
    background: rgba(251, 101, 166, 0.15);
    border-color: #fb65a6;
}

.sidebar-title {
    color: #fb65a6;
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 16px;
}

.news-card.featured {
    background: linear-gradient(135deg, #2a0018 0%, #3c0024 100%);
    border: 1px solid #fb65a6;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 16px;
    text-align: center;
}

.news-badge {
    color: #fb65a6;
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 4px;
}

.news-title-big {
    font-size: 28px;
    font-weight: 800;
    color: #ffffff;
    text-shadow: 0 0 20px rgba(251, 101, 166, 0.3);
}

.news-item {
    display: flex;
    gap: 12px;
    padding: 14px;
    background-color: #141414;
    border-radius: 10px;
    margin-bottom: 10px;
    border: 1px solid #222222;
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;
}

.news-item:hover {
    border-color: #fb65a6;
    background-color: #1a1a1a;
}

.news-icon {
    width: 48px;
    height: 48px;
    background-color: #222222;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.news-icon img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 8px;
}

.news-icon-svg {
    font-size: 24px;
    color: #fb65a6;
}

.news-content {
    flex: 1;
}

.news-title {
    color: #fb65a6;
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 4px 0;
}

.news-description {
    color: #888888;
    font-size: 12px;
    margin: 0;
    line-height: 1.4;
}

/* Center Content */
.center-content {
    flex: 1;
}

/* Banner Carousel */
.games-section {
    margin-top: 24px;
}

.games-section + .games-section {
    margin-top: 40px;
}

.games-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.games-title {
    font-size: 20px;
    font-weight: 600;
    color: #ffffff;
    display: flex;
    align-items: center;
    gap: 10px;
}

.title-icon {
    font-size: 24px;
    color: #fb65a6;
}

.games-nav {
    display: flex;
    gap: 8px;
}

.nav-btn {
    width: 36px;
    height: 36px;
    background-color: #1a1a1a;
    border: 1px solid #333333;
    border-radius: 8px;
    color: #888888;
    font-size: 18px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.nav-btn:hover {
    border-color: #fb65a6;
    color: #fb65a6;
}

.games-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 16px;
}

.game-card {
    background-color: #141414;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #222222;
    cursor: pointer;
    transition: all 0.3s ease;
    text-decoration: none;
    display: block;
}

.game-card:hover {
    border-color: #fb65a6;
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(251, 101, 166, 0.2);
}

.game-image {
    position: relative;
    aspect-ratio: 3 / 4;
    overflow: hidden;
    background-color: #141414;
}

.game-image img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
}

.card-locked {
    border-color: #353535;
}

.card-locked .game-image img {
    filter: grayscale(35%);
    transform: scale(1.01);
}

.locked-dim {
    position: absolute;
    inset: 0;
    background: linear-gradient(
        180deg,
        rgba(0, 0, 0, 0.2) 0%,
        rgba(0, 0, 0, 0.65) 100%
    );
    pointer-events: none;
}

.lock-badge-corner {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.55);
    border: 1px solid rgba(251, 101, 166, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
    backdrop-filter: blur(3px);
}

.lock-icon-corner {
    font-size: 16px;
    color: #fb65a6;
}

.game-unlock {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    color: #f7c2da;
    font-size: 12px;
    font-weight: 600;
}

.unlock-icon {
    font-size: 12px;
    color: #fb65a6;
}

.game-info {
    padding: 14px;
}

.game-name {
    font-size: 14px;
    font-weight: 700;
    color: #ffffff;
    margin: 0 0 4px 0;
}

.game-provider {
    font-size: 11px;
    color: #888888;
    display: flex;
    align-items: center;
    gap: 4px;
}

.provider-icon {
    font-size: 10px;
    color: #fb65a6;
}

/* Permanent Lock (Premium / Claude) */
.permanent-lock {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 38px;
    height: 38px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(6px);
    z-index: 2;
}

.permanent-lock-icon {
    font-size: 20px;
    color: #ffffff;
}

.premium-lock {
    background: linear-gradient(135deg, rgba(255, 193, 7, 0.95) 0%, rgba(255, 140, 0, 0.95) 100%);
    box-shadow: 0 4px 14px rgba(255, 140, 0, 0.45);
}

.claude-lock {
    background: linear-gradient(135deg, rgba(200, 120, 255, 0.95) 0%, rgba(140, 80, 230, 0.95) 100%);
    box-shadow: 0 4px 14px rgba(140, 80, 230, 0.45);
}

.game-unlocked {
    color: #10b981;
}

/* Premium cards */
.card-premium-locked .game-image {
    background: linear-gradient(135deg, #1a1405 0%, #2a1f08 100%);
    position: relative;
}

.card-premium-locked .game-image::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0) 40%, rgba(0, 0, 0, 0.55) 100%);
    pointer-events: none;
}

.card-premium-locked.is-locked .game-image img {
    opacity: 0.34;
}

.card-premium-locked:hover {
    border-color: #ffb000;
    box-shadow: 0 8px 25px rgba(255, 176, 0, 0.25);
}

.title-icon-premium {
    color: #ffb000;
}

/* Claude cards */
.card-claude-locked .game-image {
    background: linear-gradient(135deg, #14091f 0%, #221035 100%);
    position: relative;
}

.card-claude-locked .game-image::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0) 40%, rgba(0, 0, 0, 0.55) 100%);
    pointer-events: none;
}

.card-claude-locked.is-locked .game-image img {
    opacity: 0.34;
}

.card-claude-locked:hover {
    border-color: #c878ff;
    box-shadow: 0 8px 25px rgba(200, 120, 255, 0.25);
}

.title-icon-claude {
    color: #c878ff;
}

.game-unlock {
    color: #888888;
}

/* Links Úteis */
.links-section {
    margin-top: 40px;
}

.section-title {
    font-size: 18px;
    font-weight: 600;
    color: #fb65a6;
    margin: 0 0 16px 0;
}

.links-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;
}

.link-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 18px;
    background-color: #141414;
    border: 1px solid #222222;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;
}

.link-card:hover {
    border-color: #fb65a6;
    background-color: #1a1a1a;
}

.link-card.link-active {
    background: linear-gradient(135deg, #fb65a6 0%, #00aa44 100%);
    border-color: transparent;
}

.link-card.link-active .link-icon,
.link-card.link-active .link-text {
    color: #000000;
}

.link-icon {
    font-size: 20px;
    color: #fb65a6;
}

.link-text {
    font-size: 14px;
    font-weight: 500;
    color: #ffffff;
}

/* Destaques */
.highlights-section {
    margin-top: 40px;
}

.highlights-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.highlights-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 16px;
}

.highlight-card {
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #222222;
    cursor: pointer;
    transition: all 0.3s ease;
    text-decoration: none;
    display: block;
}

.highlight-card:hover {
    border-color: #fb65a6;
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(251, 101, 166, 0.2);
}

.highlight-card img {
    width: 100%;
    height: auto;
    display: block;
}

/* Responsive */
@media (max-width: 1024px) {
    .main-content {
        flex-direction: column;
    }

    .sidebar {
        width: 100%;
        order: 2;
    }

    .center-content {
        order: 1;
    }

    .banner-content h1 {
        font-size: 36px;
    }

    .banner-content h2 {
        font-size: 20px;
    }
}

@media (max-width: 640px) {
    .header {
        padding: 12px 16px;
    }

    .header-logo {
        height: 42px;
    }

    .header-right {
        gap: 10px;
    }

    .balance {
        padding: 8px 12px;
    }

    .btn-deposit {
        padding: 10px 16px;
        font-size: 12px;
    }

    .main-content {
        padding: 16px;
    }

    .carousel-btn {
        width: 32px;
        height: 32px;
        font-size: 16px;
    }

    .carousel-btn.prev {
        left: 8px;
    }

    .carousel-btn.next {
        right: 8px;
    }

    .games-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .links-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .link-card {
        padding: 12px 14px;
    }

    .link-text {
        font-size: 12px;
    }

    .highlights-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

/* Grupo VIP Modal */
.grupo-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 20px;
}

.grupo-modal {
    position: relative;
    max-width: 500px;
    width: 100%;
    border-radius: 16px;
    overflow: hidden;
    animation: modalIn 0.3s ease;
}

.campaign-copy {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 18px 20px 20px;
    color: #fff;
    text-align: center;
}

.campaign-copy strong { font-size: 20px; }
.campaign-copy small { color: #aaa; line-height: 1.5; }

@keyframes modalIn {
    from {
        opacity: 0;
        transform: scale(0.9);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

.grupo-modal-close {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 36px;
    height: 36px;
    background: rgba(0, 0, 0, 0.6);
    border: none;
    border-radius: 50%;
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    z-index: 10;
    transition: background 0.2s;
}

.grupo-modal-close:hover {
    background: rgba(0, 0, 0, 0.8);
}

.grupo-banner-link {
    display: block;
    width: 100%;
}

.grupo-banner-img {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 16px;
}

.push-prompt {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    text-align: left;
    padding: 14px;
    margin-bottom: 12px;
    border-radius: 12px;
    background: linear-gradient(135deg, #1a0410 0%, #2a0818 100%);
    border: 1px solid rgba(251, 101, 166, 0.4);
    cursor: pointer;
    transition: all 0.2s ease;
}

.push-prompt:hover:not(:disabled):not(.push-blocked) {
    border-color: #fb65a6;
    box-shadow: 0 0 16px rgba(251, 101, 166, 0.2);
}

.push-prompt:disabled {
    opacity: 0.7;
    cursor: default;
}

.push-prompt.push-blocked {
    cursor: default;
    border-color: rgba(255, 93, 108, 0.4);
}

.push-prompt-icon {
    width: 42px;
    height: 42px;
    flex-shrink: 0;
    border-radius: 10px;
    background: rgba(251, 101, 166, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    color: #fb65a6;
}

.push-prompt-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}

.push-prompt-text strong {
    font-size: 14px;
    color: #fff;
}

.push-prompt-text span {
    font-size: 12.5px;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.4;
}

.push-prompt-error {
    color: #ff5d6c !important;
}

.push-prompt-icon .spin {
    animation: spin 1s linear infinite;
}

/* ===== Layout igual ao Clube da BB: coluna única, cartões e central de conexões ===== */
.dashboard { --accent: var(--tenant-primary, #fb65a6); background: #090909; }
.header { background: #090909f2; backdrop-filter: blur(14px); border-bottom: 1px solid #ffffff12; }
.main-content { flex-direction: column; max-width: 1300px; margin: 0 auto; padding: 24px clamp(16px, 4vw, 64px) 40px; gap: 36px; }
.center-content { order: 1; }
.sidebar { order: 2; width: 100%; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.sidebar > .btn-confirmar-compra,
.sidebar > .sidebar-title,
.sidebar > .news-card { grid-column: 1 / -1; }
.sidebar .news-item, .sidebar .push-prompt { margin: 0; }
.games-grid { grid-template-columns: repeat(auto-fill, minmax(184px, 1fr)); gap: 18px; }
.game-card { border-radius: 16px; background: linear-gradient(180deg, #1a1a1a, #111); border-color: #ffffff14; box-shadow: 0 12px 28px #00000038; }
.game-card:hover { transform: translateY(-5px); border-color: #ffffff14; box-shadow: 0 18px 34px #00000075; }
.game-image { aspect-ratio: 4 / 5; }
.game-image img { object-fit: cover; }
.game-info { min-height: 72px; padding: 12px; }
.game-name { font-size: 13px; text-transform: uppercase; }
.permanent-lock { top: 11px; right: 11px; width: 42px; height: 42px; border-radius: 50%; border: 1px solid #ffb000a8; background: rgba(11, 11, 11, .84); color: #ffd15a; }
.claude-lock { border-color: #c084fca0; background: rgba(31, 15, 46, .78); color: #d8b4fe; }
.connection-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 15px; }
.connection-head small { color: var(--accent); font-weight: 900; letter-spacing: .12em; }
.connection-head h2 { margin: 3px 0 0; font-size: 27px; text-transform: uppercase; }
.connection-head p { max-width: 340px; margin: 0; color: #999; font-size: 13px; line-height: 1.45; text-align: right; }
.links-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.link-card { position: relative; min-height: 112px; padding: 18px; gap: 13px; border-radius: 16px; border-color: #ffffff18; background: linear-gradient(135deg, #191319, #151515); transition: transform .18s ease, border-color .18s ease; }
.link-card:hover, .link-card:focus-visible { transform: translateY(-3px); border-color: var(--accent); background: linear-gradient(135deg, #191319, #151515); outline: none; }
.connection-icon { width: 46px; height: 46px; flex: none; display: grid; place-items: center; border-radius: 14px; color: var(--accent); font-size: 24px; background: color-mix(in srgb, var(--accent) 14%, #171717); }
.connection-text { display: flex; flex: 1; min-width: 0; flex-direction: column; }
.connection-text em { color: var(--accent); font-size: 10px; font-style: normal; font-weight: 900; letter-spacing: .12em; }
.connection-text strong { color: #fff; font-size: 16px; }
.connection-text small { color: #999; margin-top: 3px; }
.connection-arrow { color: #888; font-size: 20px; }
.responsible { display: flex; gap: 14px; max-width: 1300px; margin: 0 auto 40px; padding: 20px; width: calc(100% - clamp(32px, 8vw, 128px)); border-radius: 14px; background: #111; border: 1px solid #ffffff12; color: #999; }
.responsible svg { flex: none; font-size: 28px; color: var(--accent); }
.responsible strong { color: #fff; }
.responsible p { margin: 5px 0 0; }
.bottom-nav { display: none; }
@media (max-width: 850px) {
    .main-content { padding: 16px 14px 24px; }
    .connection-head { flex-direction: column; align-items: flex-start; }
    .connection-head p { text-align: left; }
    .links-grid, .sidebar { grid-template-columns: 1fr; }
    .games-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .dashboard { padding-bottom: 70px; }
    .responsible { width: calc(100% - 28px); }
    .bottom-nav { display: grid; grid-template-columns: repeat(5, 1fr); position: fixed; inset: auto 0 0; height: 70px; background: #141414; border-top: 1px solid #ffffff16; z-index: 90; }
    .bottom-nav > * { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; color: #888; text-decoration: none; font-size: 10px; }
    .bottom-nav svg { font-size: 21px; }
    .bottom-nav .active { color: var(--accent); }
}
.home-extras { max-width: 1300px; margin: 18px auto 0; padding: 0 clamp(16px, 4vw, 64px); display: grid; gap: 18px; }
.live { min-height: 74px; display: flex; align-items: center; gap: 13px; padding: 12px 18px; background: linear-gradient(100deg, color-mix(in srgb, var(--accent) 18%, #171717), #171717 55%); border: 1px solid color-mix(in srgb, var(--accent) 65%, transparent); border-radius: 14px; color: #fff; text-decoration: none; }
.live > i { width: 12px; height: 12px; flex: none; border-radius: 50%; background: var(--accent); box-shadow: 0 0 14px var(--accent); }
.live div { display: flex; flex: 1; flex-direction: column; }
.live small { color: var(--accent); font-weight: 900; letter-spacing: .12em; }
.live > span { color: #bbb; }
.live b { display: flex; gap: 7px; align-items: center; padding: 11px 19px; border-radius: 10px; background: var(--accent); color: #16040f; }
.live:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.xp { padding: 16px 18px; background: #171717; border: 1px solid #ffffff14; border-radius: 13px; }
.xp > div:first-child { display: flex; justify-content: space-between; margin-bottom: 10px; }
.xp span { color: #aaa; }
.track { height: 9px; background: #292929; border-radius: 10px; overflow: hidden; }
.track i { display: block; height: 100%; background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 60%, white)); }
.community { display: flex; justify-content: center; gap: 35px; color: #aaa; }
.community span { display: flex; align-items: center; gap: 7px; }
.community svg, .community strong { color: #fff; }
.community i { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 8px #22c55e; }
@media (max-width: 850px) {
    .home-extras { padding-inline: 14px; }
    .live { flex-wrap: wrap; }
    .live div { min-width: 150px; }
    .live > span { order: 3; margin-left: 25px; font-size: 12px; }
    .live b { margin-left: auto; }
    .community { gap: 14px; font-size: 12px; }
}
.push-overlay { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 20px; background: rgba(0, 0, 0, .78); backdrop-filter: blur(7px); }
.push-modal { position: relative; width: min(390px, 100%); padding: 32px 26px 24px; text-align: center; color: #fff; border: 1px solid color-mix(in srgb, var(--accent) 42%, transparent); border-radius: 26px; background: radial-gradient(circle at 50% 0, color-mix(in srgb, var(--accent) 30%, #171217), #171217 67%); box-shadow: 0 24px 80px #000; }
.push-modal:focus { outline: none; }
.push-modal-icon { width: 68px; height: 68px; margin: 0 auto 14px; display: grid; place-items: center; border-radius: 50%; color: color-mix(in srgb, var(--accent) 60%, white); font-size: 34px; background: color-mix(in srgb, var(--accent) 16%, transparent); }
.push-modal h2 { margin: 0 0 8px; font-size: 25px; }
.push-modal p { margin: 0 0 22px; color: #d0b4c5; font-size: 14px; line-height: 1.45; }
.push-modal .push-modal-error { color: #ff8796; }
.push-modal-cta, .push-modal-later { width: 100%; min-height: 48px; display: flex; align-items: center; justify-content: center; gap: 8px; border: 0; border-radius: 12px; font: inherit; font-weight: 800; cursor: pointer; }
.push-modal-cta { background: var(--accent); color: #16040f; box-shadow: 0 8px 20px color-mix(in srgb, var(--accent) 30%, transparent); }
.push-modal-cta:disabled { opacity: .7; }
.push-modal-later { margin-top: 8px; background: transparent; color: #c9a4ba; }
.push-close { position: absolute; top: 10px; right: 10px; width: 44px; height: 44px; border: 0; border-radius: 50%; color: #ddd; background: #ffffff12; cursor: pointer; }
.push-close:focus-visible, .push-modal-cta:focus-visible, .push-modal-later:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.banners { margin-bottom: 32px; }
.banner-track { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; border-radius: 18px; border: 1px solid #ffffff14; scrollbar-width: none; }
.banner-track::-webkit-scrollbar { display: none; }
.banner-slide { flex: 0 0 100%; scroll-snap-align: start; display: block; }
.banner-slide img { display: block; width: 100%; aspect-ratio: 3 / 1; object-fit: cover; }
.banner-slide:focus-visible { outline: 3px solid var(--accent); outline-offset: -3px; }
.dots { display: flex; justify-content: center; gap: 6px; margin-top: 10px; }
.dots i { width: 7px; height: 7px; border-radius: 9px; background: #ffffff30; transition: width .2s, background .2s; }
.dots i.on { width: 22px; background: var(--accent); }
.hero-video { margin-bottom: 32px; border-radius: 18px; overflow: hidden; border: 1px solid #ffffff14; background: #000; }
.hero-video video { display: block; width: 100%; max-height: 440px; }
.wallet-overlay { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: end center; padding: 20px; background: rgba(0, 0, 0, .7); backdrop-filter: blur(7px); }
.wallet-modal { position: relative; width: min(430px, 100%); padding: 28px 24px 22px; text-align: center; border: 1px solid #ffffff1c; border-radius: 24px; background: linear-gradient(145deg, #24101e, #151515 65%); box-shadow: 0 24px 60px #000; }
.wallet-close { position: absolute; top: 8px; right: 8px; width: 44px; height: 44px; border: 0; border-radius: 50%; color: #ddd; background: #ffffff12; cursor: pointer; }
.wallet-icon { width: 56px; height: 56px; margin: 0 auto 10px; display: grid; place-items: center; border-radius: 16px; color: var(--accent); font-size: 28px; background: color-mix(in srgb, var(--accent) 16%, transparent); }
.wallet-label { margin: 0; color: #ff8ec8; font-size: 11px; font-weight: 900; letter-spacing: .14em; }
.wallet-balance { display: block; margin: 6px 0 18px; font-size: 34px; }
.wallet-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.wallet-deposit, .wallet-withdraw { min-height: 48px; display: flex; align-items: center; justify-content: center; gap: 7px; border-radius: 12px; font: inherit; font-weight: 800; cursor: pointer; }
.wallet-deposit { border: 0; background: var(--accent); color: #16040f; }
.wallet-withdraw { border: 1px solid #ffffff2a; background: transparent; color: #fff; }
.wallet-hint { display: flex; gap: 6px; justify-content: center; margin-top: 14px; color: #999; font-size: 12px; }
.wallet-close:focus-visible, .wallet-deposit:focus-visible, .wallet-withdraw:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.bottom-nav button { border: 0; background: transparent; font: inherit; cursor: pointer; }
@media (max-width: 850px) { .wallet-overlay { place-items: end center; } }
@media (prefers-reduced-motion: reduce) { .dots i { transition: none; } .banner-track { scroll-behavior: auto; } }
</style>
