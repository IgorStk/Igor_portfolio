export type DocumentSection = { title: string; paragraphs: { heading?: string; text: string; href?: string }[]; photo?: boolean };

export const contacts = [
  { label: 'E-mail', text: 'igorrobertofreitasbarbosa@gmail.com', href: 'mailto:igorrobertofreitasbarbosa@gmail.com' },
  { label: 'Telefone', text: '+55 85 98826-3427', href: 'tel:+5585988263427' },
  { label: 'LinkedIn', text: 'linkedin.com/in/igor-roberto-freitas-barbosa-297ba438b', href: 'https://www.linkedin.com/in/igor-roberto-freitas-barbosa-297ba438b' },
  { label: 'GitHub', text: 'github.com/IgorStk', href: 'https://github.com/IgorStk' },
];

export const documents: DocumentSection[] = [
  { title: 'Sobre Mim', photo: true, paragraphs: [
    { heading: 'Igor Roberto Freitas Barbosa', text: 'Sou desenvolvedor de software e estudante de Ciência da Computação pela UNIFOR. Tenho experiência no desenvolvimento de APIs REST, na integração entre diferentes componentes de aplicações e na idealização e desenvolvimento de projetos pessoais.' },
  ] },
  { title: 'Habilidades', paragraphs: [
    { heading: 'Linguagens', text: 'JavaScript, Java, Python e TypeScript.' },
    { heading: 'Front-End', text: 'JavaScript, React.js, Next.js, Vite, Tailwind CSS, CSS, HTML e Three.js.' },
    { heading: 'Back-End', text: 'Node.js, Express, NestJS, Prisma e API REST.' },
    { heading: 'Banco de Dados', text: 'MySQL, SQL e PostgreSQL.' },
    { heading: 'Infra e DevOps', text: 'Git, Docker, Docker Compose, Postman e Vercel.' },
    { heading: 'Competências interpessoais', text: 'Trabalho em equipe. Comunicação clara e objetiva.' },
    { heading: 'Idiomas', text: 'Português: Fluente / Nativo\nInglês: Intermediário' },
  ] },
  { title: 'Formação Acadêmica', paragraphs: [
    { heading: 'Bacharelado em Ciência da Computação', text: 'Universidade de Fortaleza — UNIFOR\n2025 – 2028' },
    { heading: 'Destaques', text: 'Lógica de Programação\nEstrutura de Dados' },
  ] },
  { title: 'Projetos', paragraphs: [
    { heading: 'Mollire — Deploy de frontends direto do GitHub', text: 'Plataforma de deploy para aplicações frontend. Você conecta o repositório do GitHub e o projeto sobe com subdomínio próprio, com acompanhamento do build ao vivo. Suporta SPA e SSR. Cada build roda isolado em container Docker, os logs chegam em tempo real via SSE e o roteamento de subdomínios é feito pelo Nginx como reverse proxy.\nCódigo de Acesso: 1430' },
    { heading: 'Lectio — Gerenciamento de biblioteca', text: 'Desenvolvi, em equipe, um sistema mobile para gerenciamento de uma biblioteca universitária, utilizando Node.js, NestJS e Express. O aplicativo foi desenvolvido em Kotlin no Android Studio e possui versão web.' },
    { text: 'O sistema foi projetado para otimizar os serviços da biblioteca, oferecendo cadastro de alunos, reserva de livros e cabines de estudo, tira-dúvidas com IA, gamificação, grupos de estudo e um mapa interativo dividido por seções.' },
    { heading: 'Analista de Postura', text: 'Desenvolvi um programa em Python que utiliza a webcam do computador para monitorar a postura e emitir alertas sonoros e visuais ao identificar uma postura muito curvada ou proximidade excessiva da câmera.' },
    { text: 'Projetei o sistema para solucionar um problema real do meu dia a dia, buscando reduzir os impactos de passar diversas horas em frente ao computador.\nCódigo de Acesso: 1431' },
  ] },
];
