import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Pixel Agents',
  tagline: 'The game interface where AI agents build real things',
  favicon: 'img/favicon.png',

  url: 'https://pixel-agents-hq.github.io',
  baseUrl: '/docs/',

  organizationName: 'pixel-agents-hq',
  projectName: 'docs',

  onBrokenLinks: 'throw',

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  themes: ['@docusaurus/theme-mermaid'],

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/pixel-agents-hq/docs/edit/main/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    mermaid: {
      theme: {light: 'base', dark: 'base'},
      options: {
        fontSize: 18,
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        themeVariables: {
          fontSize: '18px',
          primaryColor: '#20203a',
          primaryTextColor: '#e0daff',
          primaryBorderColor: '#746fff',
          secondaryColor: '#2a2a4a',
          secondaryTextColor: '#e0daff',
          secondaryBorderColor: '#505074',
          tertiaryColor: '#181828',
          tertiaryTextColor: '#e0daff',
          tertiaryBorderColor: '#3c3c60',
          lineColor: '#8888a8',
          textColor: '#8888a8',
          edgeLabelBackground: 'rgba(0, 0, 0, 0)',
          clusterBkg: 'rgba(0, 0, 0, 0)',
          clusterBorder: '#3c3c60',
          actorBkg: '#20203a',
          actorTextColor: '#e0daff',
          actorBorder: '#746fff',
          signalColor: '#8888a8',
          signalTextColor: '#8888a8',
          activationBkgColor: '#2a2a4a',
          activationBorderColor: '#746fff',
          noteBkgColor: '#2a2a4a',
          noteTextColor: '#e0daff',
          noteBorderColor: '#505074',
          labelBoxBkgColor: '#20203a',
          labelBoxBorderColor: '#746fff',
          labelTextColor: '#e0daff',
          loopTextColor: '#e0daff',
        },
      },
    },
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'PIXEL AGENTS',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'guideSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/pixel-agents-hq/docs',
          label: 'GitHub',
          position: 'right',
        },
        {
          type: 'custom-crtToggle',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'light',
      copyright: `Released under MIT License. Copyright ${new Date().getFullYear()} Pablo De Lucca.`,
    },
    // Algolia DocSearch — fill in after DocSearch approval
    // algolia: {
    //   appId: 'YOUR_APP_ID',
    //   apiKey: 'YOUR_SEARCH_API_KEY',
    //   indexName: 'pixel-agents-docs',
    // },
  } satisfies Preset.ThemeConfig,
};

export default config;
