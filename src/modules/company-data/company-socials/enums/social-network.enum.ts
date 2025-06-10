import { registerEnumType } from '@nestjs/graphql';

export enum SocialNetworkType {
  FACEBOOK = 'FACEBOOK',
  INSTAGRAM = 'INSTAGRAM',
  TIKTOK = 'TIKTOK',
  YOUTUBE = 'YOUTUBE',
  LINKEDIN = 'LINKEDIN',
  TWITTER = 'TWITTER',
  WHATSAPP = 'WHATSAPP',
  TELEGRAM = 'TELEGRAM',
  PINTEREST = 'PINTEREST',
  SNAPCHAT = 'SNAPCHAT',
  WEBSITE = 'WEBSITE',
  BLOG = 'BLOG',
  OUTRAS = 'OUTRAS',
}

registerEnumType(SocialNetworkType, {
  name: 'SocialNetworkType',
  description: 'Tipos de redes sociais e canais de comunicação',
  valuesMap: {
    FACEBOOK: {
      description: 'Facebook',
    },
    INSTAGRAM: {
      description: 'Instagram',
    },
    TIKTOK: {
      description: 'TikTok',
    },
    YOUTUBE: {
      description: 'YouTube',
    },
    LINKEDIN: {
      description: 'LinkedIn',
    },
    TWITTER: {
      description: 'Twitter (X)',
    },
    WHATSAPP: {
      description: 'WhatsApp',
    },
    TELEGRAM: {
      description: 'Telegram',
    },
    PINTEREST: {
      description: 'Pinterest',
    },
    SNAPCHAT: {
      description: 'Snapchat',
    },
    WEBSITE: {
      description: 'Website',
    },
    BLOG: {
      description: 'Blog',
    },
    OUTRAS: {
      description: 'Outras redes sociais',
    },
  },
});
