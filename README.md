# Igor Roberto — Portfólio 3D

React + Vite + TypeScript + Three.js.

```sh
npm install
npm run dev
```

`npm run build` verifica o TypeScript e gera a versão de produção em `dist`.

A tela permanece preta. Quando o modelo, a textura e a foto estão carregados, a luz fria revela a mesa e quatro folhas de currículo. Em conexões lentas, a entrada espera os arquivos. O movimento da câmera respeita a preferência por movimento reduzido.

Clique ou toque em uma folha para abrir a leitura. Feche com o botão × ou Escape. A navegação por Tab também permite abrir todas as folhas. Sobre Mim contém foto e links de e-mail, telefone, LinkedIn e GitHub, extraídos do currículo fornecido. A interface inicial não exibe textos fora dos documentos.

O modelo fornecido está em `public/models/table_obj`. A textura `table_color.jpg` é aplicada diretamente com um material físico, pois o MTL original referencia um caminho absoluto do computador do autor. Os arquivos originais foram preservados.

Cena, câmera e iluminação: `src/App.tsx`. Conteúdo: `src/documents.ts`. Texturas das folhas: `src/paper.ts`. Leitura responsiva: `src/style.css`. Foto: `public/profile.jpg`.

Após a luz acender, a câmera mantém a vista frontal por 1,2 segundo e faz a aproximação com inclinação para os papéis em 3,4 segundos. Com movimento reduzido, usa diretamente o enquadramento final. Idiomas integra Habilidades. Os rodapés das folhas abertas ficam ancorados ao fim da página, com a mesma margem inferior.


Conteúdo atualizado a partir do currículo revisado, incluindo Mollire (com link), Lectio e Analista de Postura. Cada folha possui um marcador clicável que acompanha sua posição 3D; o nome da seção aparece ao passar o mouse na folha ou focar o marcador pelo teclado.


Ao abrir uma folha, o modelo 3D se ergue até a câmera e se funde ao documento de leitura em 520 ms. A cena usa um shader de vinheta e os documentos têm bordas suavemente escurecidas. A câmera final está mais próxima da mesa.


Névoa procedural animada: src/mist.ts. Camadas transparentes com ruído em múltiplas escalas criam movimento lento ao redor da mesa, preservando a área dos papéis. O efeito acompanha a entrada da luz e fica estático com movimento reduzido.


Notebook interativo: clique no modelo ou na bolinha para aproximar a câmera. A interface é projetada na tela 3D por CSS3DRenderer. Digite 1430 para abrir https://mollire.aulvi.com.br ou 1431 para abrir https://github.com/IgorStk/Detector-de-Postura em outra aba/janela. Outros valores exibem código inválido na própria tela. Enter também valida; Escape ou × retorna à mesa.

