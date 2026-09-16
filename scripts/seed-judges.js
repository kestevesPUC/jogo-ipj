// One-off seed script: inserts a "Livro de Juízes" theme with 100 questions
// for the given user. Run with: node scripts/seed-judges.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const OWNER_EMAIL = "kaiotest@example.com";

const questions = [
  ["Depois da morte de quem os israelitas passaram a perguntar ao Senhor quem lutaria primeiro contra os cananeus?", "Josué"],
  ["Qual tribo o Senhor designou para subir primeiro contra os cananeus?", "Judá"],
  ["Qual tribo Judá convidou para lutar junto contra os cananeus e perizeus?", "Simeão"],
  ["Em que cidade Judá e Simeão derrotaram dez mil homens?", "Bezeque"],
  ["Qual rei cananeu teve os polegares das mãos e dos pés cortados em Bezeque?", "Adoni-Bezeque"],
  ["Quantos reis Adoni-Bezeque disse ter humilhado da mesma forma?", "Setenta"],
  ["Qual cidade também é chamada de Quiriate-Arba?", "Hebrom"],
  ["Quem Calebe prometeu dar sua filha Acsa em casamento caso conquistasse Quiriate-Sefer?", "Quem atacasse e tomasse a cidade"],
  ["Quem conquistou Quiriate-Sefer e recebeu Acsa como esposa?", "Otniel"],
  ["O que Acsa pediu ao pai além da terra do Neguebe?", "Fontes de água"],
  ["Qual tribo não conseguiu expulsar os cananeus que viviam em carros de ferro no vale?", "Judá"],
  ["Qual cidade Benjamim não conseguiu tomar dos jebuseus?", "Jerusalém"],
  ["Qual tribo não expulsou os cananeus de Bete-Seã, Taanaque e Megido?", "Manassés"],
  ["Qual tribo não expulsou os habitantes de Gezer?", "Efraim"],
  ["Qual tribo não expulsou os habitantes de Quitrom e Naalol?", "Zebulom"],
  ["Qual tribo não expulsou os habitantes de Acre, Sidom e outras cidades costeiras?", "Aser"],
  ["Qual tribo não expulsou os habitantes de Bete-Semes e Bete-Anate?", "Naftali"],
  ["Quem subiu e chorou em Boquim por causa da aliança quebrada com o Senhor?", "O anjo do Senhor"],
  ["O que o nome Boquim significa?", "Choro"],
  ["Quem morreu com cento e dez anos de idade no início do livro de Juízes?", "Josué"],
  ["Onde Josué foi sepultado?", "Timnate-Heres"],
  ["O que a geração seguinte a Josué não conheceu?", "O Senhor nem a obra que ele havia feito por Israel"],
  ["Que tipo de líderes o Senhor levantou para livrar Israel dos que o oprimiam?", "Juízes"],
  ["O que Israel fazia repetidamente durante o período dos juízes, segundo o ciclo do livro?", "O que o Senhor considerava mau, servindo a outros deuses"],
  ["Quantos anos Israel serviu Cusã-Risataim, rei da Mesopotâmia?", "Oito anos"],
  ["Quem foi o primeiro juiz de Israel mencionado no livro?", "Otniel"],
  ["De qual tribo era Otniel?", "Judá"],
  ["Quantos anos a terra teve paz depois da vitória de Otniel?", "Quarenta anos"],
  ["Qual rei moabita oprimiu Israel por dezoito anos?", "Eglom"],
  ["Quem foi o juiz canhoto que matou o rei Eglom?", "Eúde"],
  ["De qual tribo era Eúde?", "Benjamim"],
  ["Onde Eúde escondeu a espada com que matou Eglom?", "Na coxa direita, sob a roupa"],
  ["Quantos homens Sangar matou com uma aguilhada de bois?", "Seiscentos filisteus"],
  ["Quem foi juiz e também profetisa em Israel?", "Débora"],
  ["Debaixo de que árvore Débora costumava julgar Israel?", "A Palmeira de Débora"],
  ["Qual general ela convocou para lutar contra os cananeus?", "Baraque"],
  ["Quem era o rei cananeu que oprimia Israel na época de Débora?", "Jabim"],
  ["Quem era o comandante do exército de Jabim?", "Sísera"],
  ["Débora disse a Baraque que a honra da vitória iria para quem?", "Uma mulher"],
  ["Em que monte Baraque reuniu seus homens?", "Monte Tabor"],
  ["Em que rio o exército de Sísera foi derrotado?", "Rio Quisom"],
  ["Para a tenda de quem Sísera fugiu depois da derrota?", "Jael"],
  ["Com o que Jael matou Sísera enquanto ele dormia?", "Uma estaca de tenda e um martelo"],
  ["Quantos anos a terra teve paz depois da vitória de Débora e Baraque?", "Quarenta anos"],
  ["Qual povo estrangeiro invadia repetidamente as colheitas de Israel na época de Gideão?", "Os midianitas"],
  ["Onde Gideão estava debulhando trigo quando o anjo do Senhor apareceu a ele?", "No lagar, escondido dos midianitas"],
  ["Como o anjo do Senhor chamou Gideão ao aparecer para ele?", "Guerreiro valente"],
  ["De qual tribo era Gideão?", "Manassés"],
  ["O que Gideão pediu como sinal, colocando um cordeiro de lã no chão?", "Que o orvalho molhasse só a lã, e depois só o chão"],
  ["O que Gideão destruiu por ordem do Senhor na casa de seu pai?", "O altar de Baal e o poste sagrado"],
  ["Que novo nome deram a Gideão depois que ele derrubou o altar de Baal?", "Jerubaal"],
  ["Quantos homens Gideão reuniu inicialmente para lutar contra os midianitas?", "Trinta e dois mil"],
  ["Segundo o Senhor, por que o exército de Gideão era grande demais?", "Para Israel não se gabar de ter vencido por si mesmo"],
  ["Quantos homens restaram depois que os medrosos foram mandados para casa?", "Dez mil"],
  ["Como o Senhor selecionou os últimos trezentos homens?", "Pela forma como bebiam água do riacho"],
  ["O que os trezentos homens de Gideão levavam nas mãos ao atacar o acampamento midianita?", "Trombetas e potes de barro com tochas"],
  ["O que os soldados de Gideão gritaram ao atacar de noite?", "A espada do Senhor e de Gideão"],
  ["Quais dois príncipes midianitas foram mortos e tiveram as cabeças levadas a Gideão?", "Orebe e Zeebe"],
  ["Quais dois reis midianitas Gideão perseguiu e capturou?", "Zebá e Zalmuna"],
  ["O que o povo pediu que Gideão fosse depois da vitória?", "Governante sobre eles"],
  ["Como Gideão respondeu ao pedido do povo para governá-los?", "Disse que o Senhor os governaria"],
  ["O que Gideão fez com o ouro dado pelo povo, que se tornou uma armadilha?", "Fez um éfode"],
  ["Quantos filhos Gideão teve, segundo o texto?", "Setenta"],
  ["Qual era o nome do filho de Gideão com sua concubina em Siquém?", "Abimeleque"],
  ["O que Abimeleque fez aos seus próprios irmãos para se tornar rei?", "Matou-os sobre uma pedra"],
  ["Qual irmão de Abimeleque escapou da matança?", "Jotão"],
  ["Que parábola Jotão contou ao povo de Siquém sobre as árvores escolhendo um rei?", "A parábola das árvores que escolhem o espinheiro como rei"],
  ["Quem lançou uma pedra de moinho na cabeça de Abimeleque em Tebez?", "Uma mulher"],
  ["O que Abimeleque pediu a seu escudeiro para fazer depois de ser ferido?", "Matá-lo com a espada, para não se dizer que uma mulher o matou"],
  ["Quem foi juiz de Israel depois de Abimeleque, da tribo de Issacar?", "Tola"],
  ["Quantos anos Tola julgou Israel?", "Vinte e três anos"],
  ["Quem foi o juiz gileadita que teve trinta filhos montados em jumentos?", "Jair"],
  ["A que povos Israel voltou a servir antes de Jefté surgir como juiz?", "Filisteus e amonitas"],
  ["Por que Jefté foi expulso da casa de seu pai?", "Por ser filho de uma prostituta"],
  ["Quem convenceu Jefté a voltar e liderar Israel contra os amonitas?", "Os líderes de Gileade"],
  ["Que voto imprudente Jefté fez ao Senhor antes da batalha contra os amonitas?", "Oferecer em holocausto o que saísse de sua casa para recebê-lo"],
  ["Quem saiu para receber Jefté após a vitória, cumprindo tragicamente o voto?", "Sua filha"],
  ["O que a filha de Jefté pediu antes de cumprir o voto do pai?", "Dois meses para chorar sua virgindade nos montes"],
  ["Qual tribo entrou em conflito com Jefté por não terem sido chamados para a guerra contra os amonitas?", "Efraim"],
  ["Que palavra Jefté usou como teste para identificar os efraimitas nos vaus do Jordão?", "Shibolete"],
  ["Quantos efraimitas morreram por não conseguirem pronunciar corretamente a palavra-teste?", "Quarenta e dois mil"],
  ["Quem foi juiz depois de Jefté e teve trinta filhos e trinta filhas?", "Ibsã"],
  ["Quem foi o juiz zebulonita que julgou Israel por dez anos?", "Elom"],
  ["Quem foi o juiz que teve quarenta filhos e trinta netos que montavam jumentos?", "Abdom"],
  ["A que povo Israel voltou a servir por quarenta anos antes do nascimento de Sansão?", "Os filisteus"],
  ["Quem era estéril e recebeu a visita do anjo do Senhor anunciando o nascimento de um filho?", "A esposa de Manoá"],
  ["Qual era o nome do pai de Sansão?", "Manoá"],
  ["Que voto especial deveria ser guardado sobre Sansão desde o nascimento?", "O voto nazireu"],
  ["O que Sansão não podia fazer com o cabelo, segundo o voto nazireu?", "Cortá-lo"],
  ["De que cidade filisteia Sansão quis se casar com uma mulher?", "Timnate"],
  ["O que Sansão matou com as próprias mãos a caminho de Timnate?", "Um leão jovem"],
  ["O que Sansão encontrou mais tarde dentro da carcaça do leão?", "Um enxame de abelhas e mel"],
  ["Qual foi o enigma que Sansão propôs aos convidados do casamento?", "Do comedor saiu comida, e do forte saiu doçura"],
  ["Como os filisteus descobriram a resposta do enigma de Sansão?", "Ameaçaram e pressionaram a esposa dele até ela contar"],
  ["Quantos filisteus Sansão matou em Asquelom para pagar a aposta do enigma?", "Trinta"],
  ["Com o que Sansão incendiou as plantações dos filisteus?", "Trezentas raposas com tochas amarradas aos rabos"],
  ["Com que arma improvisada Sansão matou mil filisteus em Leí?", "Uma queixada de jumento"],
  ["De onde Sansão arrancou as portas da cidade durante a noite, em Gaza?", "Do portão da cidade"],
  ["Qual era o nome da mulher filisteia que Sansão amou no vale de Soreque?", "Dalila"],
  ["Quanto prata cada líder filisteu prometeu a Dalila para descobrir o segredo da força de Sansão?", "Mil e cem peças de prata"],
  ["Depois de várias mentiras, qual foi o verdadeiro segredo da força de Sansão que ele revelou a Dalila?", "Seu cabelo nunca havia sido cortado"],
  ["O que os filisteus fizeram aos olhos de Sansão depois de capturá-lo?", "Arrancaram-nos"],
  ["Que tipo de trabalho forçado Sansão foi obrigado a fazer na prisão?", "Girar a mó de um moinho"],
  ["Em homenagem a qual deus os filisteus ofereceram um grande sacrifício após capturar Sansão?", "Dagom"],
  ["O que havia acontecido com o cabelo de Sansão enquanto estava preso, sem que os filisteus percebessem?", "Havia voltado a crescer"],
  ["O que Sansão pediu ao Senhor antes do ato final no templo de Dagom?", "Força para se vingar dos filisteus por seus dois olhos"],
  ["O que Sansão empurrou para derrubar o templo sobre os filisteus?", "As duas colunas centrais do templo"],
  ["Sansão matou mais filisteus na sua morte ou durante toda a sua vida?", "Na sua morte"],
  ["Por quantos anos Sansão julgou Israel?", "Vinte anos"],
];

async function main() {
  const owner = await prisma.user.findUnique({ where: { email: OWNER_EMAIL } });
  if (!owner) {
    throw new Error(`Usuário ${OWNER_EMAIL} não encontrado. Crie a conta primeiro.`);
  }

  let theme = await prisma.theme.findFirst({
    where: { ownerId: owner.id, name: "Livro de Juízes" },
  });
  if (!theme) {
    theme = await prisma.theme.create({
      data: { name: "Livro de Juízes", ownerId: owner.id },
    });
    console.log(`Tema criado: ${theme.id}`);
  } else {
    console.log(`Tema já existia: ${theme.id}`);
  }

  const existingCount = await prisma.question.count({ where: { themeId: theme.id } });
  const capacity = 100 - existingCount;
  const toInsert = questions.slice(0, Math.max(0, capacity));

  if (toInsert.length === 0) {
    console.log("Tema já está no limite de 100 perguntas. Nada inserido.");
    return;
  }

  await prisma.question.createMany({
    data: toInsert.map(([prompt, answer]) => ({
      themeId: theme.id,
      prompt,
      answer,
      mediaType: "none",
      mediaSource: null,
      mediaValue: null,
    })),
  });

  console.log(`Inseridas ${toInsert.length} perguntas (total no tema agora: ${existingCount + toInsert.length}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
