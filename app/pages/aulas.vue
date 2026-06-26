<template>
    <div class="aulas-page">
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
                <NuxtLink to="/" class="btn-back">
                    <Icon name="ph:arrow-left-bold" />
                    Voltar
                </NuxtLink>
            </div>
        </header>

        <!-- Content -->
        <div class="content">
            <div class="page-title">
                <Icon name="ph:graduation-cap-bold" class="title-icon" />
                <h1>Aulas</h1>
                <p>
                    Aprenda as melhores estratégias com nossos conteúdos
                    exclusivos
                </p>
            </div>

            <div class="videos-grid">
                <div
                    v-for="(aula, index) in aulas"
                    :key="index"
                    class="video-card"
                >
                    <div class="video-number">{{ index + 1 }}</div>
                    <div class="video-wrapper">
                        <iframe
                            :src="aula.embedUrl"
                            :title="aula.title"
                            frameborder="0"
                            allow="
                                accelerometer;
                                autoplay;
                                clipboard-write;
                                encrypted-media;
                                gyroscope;
                                picture-in-picture;
                                web-share;
                            "
                            allowfullscreen
                        ></iframe>
                    </div>
                    <div class="video-info">
                        <h3>{{ aula.title }}</h3>
                        <p>{{ aula.description }}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
useHead({
    title: "Aulas - Rainha da Bet",
});

const aulas = [
    {
        title: "Boas Vindas",
        description:
            "Introdução à Rainha da Bet e como aproveitar ao máximo a plataforma.",
        embedUrl: "https://www.youtube.com/embed/l0ojyRnXFHw",
    },
    {
        title: "Gerenciamento 01",
        description:
            "Aprenda a gerenciar sua banca de forma inteligente e sustentável.",
        embedUrl: "https://www.youtube.com/embed/2Gx3BIV3YJk",
    },
    {
        title: "Gerenciamento 02",
        description:
            "Aprofunde suas técnicas de gerenciamento para proteger e crescer sua banca.",
        embedUrl: "https://www.youtube.com/embed/p_U4-yeIvRw",
    },
    {
        title: "Estratégia 01",
        description:
            "Conheça as primeiras estratégias para maximizar seus ganhos com segurança.",
        embedUrl: "https://www.youtube.com/embed/uzMOZSOp0oI",
    },
    {
        title: "Estratégia 02",
        description:
            "Estratégias avançadas para operar com maior precisão e consistência.",
        embedUrl: "https://www.youtube.com/embed/-gzFsu-C134",
    },
    {
        title: "Estratégia 03",
        description:
            "Técnicas finais e dicas exclusivas para alavancar seus resultados.",
        embedUrl: "https://www.youtube.com/embed/kH58DsRpni4",
    },
];
</script>

<style scoped>
.aulas-page {
    min-height: 100vh;
    background-color: #000000;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    background-color: #0a0a0a;
    border-bottom: 1px solid #1a1a1a;
    position: sticky;
    top: 0;
    z-index: 100;
}

.header-logo {
    height: 36px;
    width: auto;
}

.btn-back {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background-color: transparent;
    border: 1px solid #333333;
    border-radius: 8px;
    color: #ffffff;
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
    transition: all 0.2s ease;
}

.btn-back:hover {
    border-color: #fb65a6;
    color: #fb65a6;
}

.content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 40px 24px;
}

.page-title {
    text-align: center;
    margin-bottom: 48px;
}

.title-icon {
    font-size: 48px;
    color: #fb65a6;
    margin-bottom: 16px;
}

.page-title h1 {
    font-size: 36px;
    font-weight: 700;
    color: #ffffff;
    margin: 0 0 12px 0;
}

.page-title p {
    font-size: 16px;
    color: #888888;
    margin: 0;
}

.videos-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
}

.video-card {
    background: linear-gradient(145deg, #111111 0%, #0a0a0a 100%);
    border: 1px solid #1a1a1a;
    border-radius: 16px;
    overflow: hidden;
    transition: all 0.3s ease;
    position: relative;
}

.video-card:hover {
    border-color: #fb65a6;
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(251, 101, 166, 0.15);
}

.video-number {
    position: absolute;
    top: 16px;
    left: 16px;
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, #fb65a6 0%, #e2549a 100%);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
    color: #000000;
    z-index: 10;
}

.video-wrapper {
    position: relative;
    padding-bottom: 56.25%;
    height: 0;
    overflow: hidden;
}

.video-wrapper iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}

.video-info {
    padding: 20px;
}

.video-info h3 {
    font-size: 18px;
    font-weight: 600;
    color: #ffffff;
    margin: 0 0 8px 0;
}

.video-info p {
    font-size: 14px;
    color: #888888;
    margin: 0;
    line-height: 1.5;
}

@media (max-width: 900px) {
    .videos-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 640px) {
    .header {
        padding: 12px 16px;
    }

    .header-logo {
        height: 32px;
    }

    .btn-back {
        padding: 8px 14px;
        font-size: 13px;
    }

    .content {
        padding: 24px 16px;
    }

    .title-icon {
        font-size: 40px;
    }

    .page-title h1 {
        font-size: 28px;
    }

    .page-title p {
        font-size: 14px;
    }

    .page-title {
        margin-bottom: 32px;
    }

    .videos-grid {
        gap: 16px;
    }

    .video-card {
        border-radius: 12px;
    }

    .video-number {
        top: 12px;
        left: 12px;
        width: 28px;
        height: 28px;
        font-size: 12px;
    }

    .video-info {
        padding: 16px;
    }

    .video-info h3 {
        font-size: 16px;
    }

    .video-info p {
        font-size: 13px;
    }
}
</style>
