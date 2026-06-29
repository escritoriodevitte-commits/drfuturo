/* ============================================================
   drfuturo — Vade Mecum Digital
   Código Penal + Código de Processo Penal + Constituição Federal
   Versão compilada (principais artigos)
   ============================================================ */

const VADE_MECUM = {
  CP: {
    nome: "Código Penal (Decreto-Lei 2.848/1940)",
    artigos: [
      { num: "1", titulo: "Princípio da legalidade", texto: "Não há crime sem lei anterior que o defina. Não há pena sem prévia cominação legal." },
      { num: "2", titulo: "Lei posterior", texto: "A lei posterior que de qualquer modo favorecer o agente aplica-se aos fatos anteriores, ainda quando decididos por sentença condenatória transitada em julgado." },
      { num: "4", titulo: "Teoria do crime", texto: "Considera-se praticado o crime no momento da ação ou omissão, ainda que outro seja o momento do resultado." },
      { num: "13", titulo: "Relação de causalidade", texto: "O resultado, de que depende a existência do crime, somente é imputável a quem lhe deu causa. Considera-se causa a ação ou omissão sem a qual o resultado não teria ocorrido." },
      { num: "14", titulo: "Dolo e culpa", texto: "Diz-se o crime doloso quando o agente quis o resultado ou assumiu o risco de produzi-lo. Culposo quando o agente deu causa ao resultado por imprudência, negligência ou imperícia." },
      { num: "15", titulo: "Exclusão de dolo", texto: "O agente que, embora atuando voluntariamente, ignore ou erroneamente interprete a situação fática, não responde pelo crime doloso, podendo responder por culposo se previsto." },
      { num: "16", titulo: "Erro sobre a pessoa", texto: "O erro quanto à pessoa contra a qual o crime é praticado não isenta de responsabilidade. Não se consideram as condições ou qualidades da vítima, mas as da pessoa que o agente pretendia atingir." },
      { num: "17", titulo: "Resultado não querido", texto: "Não punem os resultados não queridos que decorrem de crime doloso, salvo se previsíveis." },
      { num: "20", titulo: "Erro de tipo", texto: "O erro sobre elemento constitutivo do tipo legal de crime exclui o dolo, mas permite a punição por crime culposo, se previsto em lei." },
      { num: "21", titulo: "Erro de proibição", texto: "O desconhecimento da lei é inescusável. O erro sobre a ilicitude do fato, se inevitável, isenta de pena; se evitável, poderá diminuí-la de um sexto a um terço." },
      { num: "22", titulo: "Coação irresistível", texto: "Se o crime é cometido sob coação irresistível, somente o coator é punido. Se resistível, a pena do coagido é atenuada." },
      { num: "23", titulo: "Excludentes de ilicitude", texto: "Não há crime quando o agente pratica o fato em estado de necessidade, legítima defesa, estrito cumprimento de dever legal ou exercício regular de direito." },
      { num: "24", titulo: "Estado de necessidade", texto: "Considera-se em estado de necessidade quem pratica o fato para salvar de perigo atual, que não provocou por sua vontade, nem podia de outro modo evitar, direito próprio ou alheio, cujo sacrifício não era razoável exigir-se." },
      { num: "25", titulo: "Legítima defesa", texto: "Entende-se como legítima defesa quem, usando moderadamente dos meios necessários, repele injusta agressão, atual ou iminente, a direito seu ou de outrem." },
      { num: "26", titulo: "Inimputabilidade - menores", texto: "É isento de pena o menor de 18 (dezoito) anos, na data do fato, sujeito às normas da legislação especial." },
      { num: "27", titulo: "Inimputabilidade - embriaguez", texto: "Não é isento de pena quem, por embriaguez completa proveniente de caso fortuito ou força maior, era, ao tempo da ação ou omissão, incapaz de entender o caráter ilícito do fato." },
      { num: "28", titulo: "Emoção e paixão", texto: "Não excluem a imputabilidade penal a emoção ou a paixão. A embriaguez voluntária não exclui a imputabilidade." },
      { num: "29", titulo: "Concurso de pessoas", texto: "Quem, de qualquer modo, concorre para o crime incide nas penas a este cominadas, na medida de sua culpabilidade." },
      { num: "30", titulo: "Circunstâncias incomunicáveis", texto: "Não se comunicam as circunstâncias e as condições de caráter pessoal, salvo quando elementares do crime." },
      { num: "31", titulo: "Ajuste, determinação, instigação", texto: "O ajuste, a determinação ou instigação e o auxílio, salvo disposição expressa em contrário, não são puníveis, se o crime não chega, pelo menos, a ser tentado." },
      { num: "32", titulo: "Penas - espécies", texto: "As penas são: I - privativas de liberdade; II - restritivas de direitos; III - de multa." },
      { num: "33", titulo: "Penal privativa de liberdade", texto: "A pena privativa de liberdade divide-se em reclusão e detenção." },
      { num: "38", titulo: "Regime inicial", texto: "O regime inicial de cumprimento da pena privativa de liberdade é determinado conforme: pena superior a 8 anos - fechado; 4 a 8 - semiaberto; até 4 - aberto." },
      { num: "44", titulo: "Substituição", texto: "As penas restritivas de direitos são autônomas e substituem as privativas de liberdade quando: aplicada pena privativa não superior a 4 anos; crime não cometido com violência ou grave ameaça; réu não reincidente." },
      { num: "49", titulo: "Multa", texto: "A multa consiste no pagamento ao fundo penitenciário da quantia fixada na sentença e calculada em dias-multa. O mínimo é 10 e o máximo 360 dias-multa." },
      { num: "59", titulo: "Fixação da pena", texto: "O juiz, atendendo à culpabilidade, aos antecedentes, à conduta social, à personalidade do agente, aos motivos, às circunstâncias e consequências do crime, estabelecerá a pena." },
      { num: "60", titulo: "Pena-base", texto: "Fixada a pena-base, o juiz considera as circunstâncias atenuantes e agravantes, e por último as causas de aumento e diminuição." },
      { num: "61", titulo: "Agravantes", texto: "São circunstâncias que sempre agravam a pena: reincidência; ter o agente cometido o crime por motivo fútil ou torpe; com traição, emboscada, etc." },
      { num: "65", titulo: "Atenuantes", texto: "São circunstâncias que sempre atenuam a pena: ser o agente menor de 21 anos; ter confessado espontaneamente; ter sofrido coação; etc." },
      { num: "68", titulo: "Concurso de circunstâncias", texto: "No concurso de agravantes e atenuantes, a pena deve aproximar-se do limite indicado pelas circunstâncias preponderantes." },
      { num: "69", titulo: "Concurso material", texto: "Quando o agente, mediante mais de uma ação ou omissão, pratica dois ou mais crimes, aplicam-se cumulativamente as penas em que haja incorrido." },
      { num: "70", titulo: "Concurso formal", texto: "Quando o agente, mediante uma só ação ou omissão, pratica dois ou mais crimes, aplica-se a mais grave ou, se iguais, apenas uma, aumentada de um sexto até a metade." },
      { num: "71", titulo: "Crime continuado", texto: "Quando o agente, mediante mais de uma ação, pratica crimes da mesma espécie, em condições de tempo, lugar e maneira de execução, são considerados como um só crime, aumentada a pena." },
      { num: "73", titulo: "Efeito da condenação", texto: "A condenação irrevogável poderá ter efeitos: perda de instrumentos do crime; perda em favor da União dos produtos do crime." },
      { num: "83", titulo: "Sursis", texto: "O juiz poderá suspender por 2 a 4 anos a execução da pena que não seja superior a 2 anos, ouvida a defesa." },
      { num: "121", titulo: "Homicídio", texto: "Matar alguém: reclusão de 6 a 20 anos. §1º Privilegiado: se impelido por motivo de relevante valor social ou moral, ou sob domínio de violenta emoção, pode reduzir de 1/6 a 1/3. §2º Qualificado: mediante paga, motivo fútil, recursos que dificultem defesa, etc., reclusão de 12 a 30 anos." },
      { num: "122", titulo: "Induzimento ao suicídio", texto: "Induzir ou instigar alguém a suicidar-se ou prestar-lhe auxílio para que o faça: reclusão de 2 a 6 anos. Aumenta se a vítima é menor ou vulnerável." },
      { num: "123", titulo: "Infanticídio", texto: "Matar, sob a influência do estado puerperal, a própria criança durante o parto ou logo após: detenção de 2 a 6 anos." },
      { num: "124", titulo: "Aborto", texto: "Provocar aborto, com consentimento da gestante: reclusão de 1 a 4 anos. Sem consentimento: 3 a 8 anos. Não se pune aborto necessário para salvar vida da gestante ou em caso de estupro." },
      { num: "129", titulo: "Lesão corporal", texto: "Ofender integridade corporal ou saúde: detenção 3 meses a 1 ano. §1º Se há privação de sentidos ou incapacidade por mais de 30 dias: 1 a 5 anos. §6º Violência doméstica: 3 meses a 3 anos." },
      { num: "133", titulo: "Abandono de incapaz", texto: "Expor a perigo a vida ou saúde de pessoa sob sua guarda, incapaz de defender-se: detenção 6 meses a 3 anos." },
      { num: "135", titulo: "Omissão de socorro", texto: "Deixar de prestar assistência a abandonado ou perdido, ou comunicar à autoridade: detenção 1 a 6 meses. Aumenta em caso de morte." },
      { num: "146", titulo: "Constrangimento ilegal", texto: "Constranger alguém, mediante violência ou grave ameaça, a não fazer o que a lei permite ou a fazer o que ela não manda: detenção 3 meses a 1 ano." },
      { num: "147", titulo: "Ameaça", texto: "Ameaçar alguém, por palavra, gesto ou outro meio, de causar-lhe mal injusto e grave: detenção 1 a 6 meses." },
      { num: "148", titulo: "Sequestro e cárcere privado", texto: "Privar alguém de sua liberdade, mediante sequestro ou cárcere privado: reclusão 1 a 3 anos. Aumenta se dura mais de 15 dias ou se vítima é menor." },
      { num: "155", titulo: "Furto", texto: "Subtrair coisa alheia móvel para si ou outrem: reclusão 1 a 4 anos. §1º Qualificado: com destruição, escalada, destreza, chave falsa, etc." },
      { num: "157", titulo: "Roubo", texto: "Subtrair coisa móvel alheia mediante grave ameaça ou violência: reclusão 4 a 10 anos. §1º Se há lesão corporal: 8 a 16 anos. Majorantes: concurso de agentes, uso de arma, etc." },
      { num: "158", titulo: "Extorsão", texto: "Constranger alguém, mediante violência ou grave ameaça, a fazer, tolerar ou deixar de fazer algo, com intuito de obter indevida vantagem: reclusão 4 a 10 anos." },
      { num: "159", titulo: "Extorsão mediante sequestro", texto: "Sequestrar pessoa com fim de obter vantagem como condição ou preço do resgate: reclusão 8 a 15 anos. Se resulta morte: 24 a 30 anos." },
      { num: "163", titulo: "Dano", texto: "Destruir, inutilizar ou deteriorar coisa alheia: detenção 1 a 6 meses. Qualificado: contra patrimônio da União, Estados, Municípios, etc." },
      { num: "171", titulo: "Estelionato", texto: "Obter para si ou outrem vantagem ilícita, em prejuízo alheio, induzindo ou mantendo alguém em erro, mediante artifício, ardil ou outro meio fraudulento: reclusão 1 a 5 anos." },
      { num: "213", titulo: "Estupro", texto: "Constranger alguém, mediante violência ou grave ameaça, a ter conjunção carnal ou praticar outro ato libidinoso: reclusão 6 a 10 anos. Lei 12.015/2009." },
      { num: "214", titulo: "Estupro de vulnerável", texto: "Ter conjunção carnal ou praticar ato libidinoso com menor de 14 anos: reclusão 8 a 15 anos." },
      { num: "288", titulo: "Associação criminosa", texto: "Associarem-se 3 ou mais pessoas, em quadrilha ou bando, para praticar crimes: reclusão 1 a 3 anos." },
      { num: "311", titulo: "Descaminho", texto: "Iludir pagamento de imposto ou direito devido pela entrada, saída ou consumo de mercadoria: detenção 1 a 4 anos." },
      { num: "312", titulo: "Peculato", texto: "Apropriar-se de dinheiro, valor ou bem móvel público, ou desviá-lo em proveito próprio: reclusão 2 a 12 anos." },
      { num: "332", titulo: "Corrupção passiva", texto: "Solicitar, receber ou aceitar vantagem indevida para si ou outrem, em razão da função: reclusão 2 a 12 anos." },
      { num: "333", titulo: "Corrupção ativa", texto: "Oferecer ou prometer vantagem indevida a funcionário público: reclusão 1 a 8 anos." },
      { num: "339", titulo: "Exercício arbitrário das próprias razões", texto: "Exercer direito que sabe não lhe pertencer, ou exceder limites: detenção 15 dias a 6 meses." },
    ],
  },
  CPP: {
    nome: "Código de Processo Penal (Decreto-Lei 3.689/1941)",
    artigos: [
      { num: "5º", titulo: "Direito ao silêncio", texto: "O interrogando será informado do seu direito de permanecer calado e de que suas respostas poderão ser usadas contra ele." },
      { num: "6º", titulo: "Inquérito policial", texto: "A autoridade policial tomará conhecimento do fato e proceder à investigação para averiguar a materialidade e autoria." },
      { num: "10", titulo: "Prazo do inquérito", texto: "Indiciado preso: 10 dias. Solto: 30 dias. Prorrogáveis em casos complexos." },
      { num: "14", titulo: "Ação penal pública", texto: "A ação penal pública é promovida pelo Ministério Público. Condicionada depende de representação do ofendido." },
      { num: "24", titulo: "Prazo de representação", texto: "O prazo para representação é de 6 meses contados do conhecimento da autoria." },
      { num: "26", titulo: "Queixa-crime", texto: "A ação penal privada é promovida por meio de queixa do ofendido ou de quem o represente." },
      { num: "30", titulo: "Prazo da queixa", texto: "O prazo para oferecimento da queixa é de 6 meses, contado do dia em que veio a saber quem seja o autor do crime." },
      { num: "39", titulo: "Representação", texto: "A representação será feita orally ou por escrito, perante o juiz, ou perante autoridade policial." },
      { num: "41", titulo: "Recebimento da denúncia", texto: "O juiz receberá a denúncia se houver justa causa, definição do fato e indícios de autoria." },
      { num: "46", titulo: "Prazo para denúncia", texto: "Réu preso: 5 dias. Réu solto: 15 dias. Contados da conclusão do inquérito." },
      { num: "55", titulo: "Defesa preliminar (Lei 11.343)", texto: "Nos crimes de tráfico, a defesa pode oferecer defesa preliminar em 3 dias antes do recebimento da denúncia." },
      { num: "100", titulo: "Ação penal privada subsidiária", texto: "Se o MP não oferece denúncia no prazo, o ofendido pode fazê-lo." },
      { num: "155", titulo: "Inquérito policial - início", texto: "O inquérito policial inicia-se: por requisição da autoridade judiciária ou do MP; por portaria; por auto de prisão em flagrante; por notícia-crime." },
      { num: "212", titulo: "Perguntas pela partes", texto: "As perguntas serão formuladas pelas partes diretamente à testemunha e ao ofendido." },
      { num: "226", titulo: "Reconhecimento", texto: "O reconhecimento deve seguir procedimento: descrição prévia, separação de pessoas, observação pelo reconhecedor." },
      { num: "229", titulo: "Acareação", texto: "A acareação será admitida entre acusados, entre acusado e testemunha, entre testemunhas, entre acusado e ofendido." },
      { num: "286", titulo: "Interrogatório - local", texto: "O interrogatório será realizado no estabelecimento prisional onde o acusado estiver recolhido, salvo se houver risco." },
      { num: "302", titulo: "Prisão em flagrante", texto: "Considera-se em flagrante quem: está cometendo; acabou de cometer; é perseguido logo após; é encontrado com instrumentos do crime." },
      { num: "310", titulo: "Audiência de custódia", texto: "Em até 24h, o juiz deve receber o preso, analisar legalidade da prisão e decidir: relaxar, converter em preventiva, ou conceder liberdade." },
      { num: "312", titulo: "Prisão preventiva", texto: "A prisão preventiva pode ser decretada: garantia da ordem pública; ordem econômica; conveniência da instrução criminal; aplicação da lei penal." },
      { num: "313", titulo: "Requisitos da preventiva", texto: "Requer prova da materialidade e indícios suficientes de autoria." },
      { num: "316", titulo: "Revogação da preventiva", texto: "O juiz pode revogar a preventiva se desaparecerem os motivos que a justificaram." },
      { num: "319", titulo: "Medidas cautelares diversas", texto: "São medidas: comparecimento periódico; proibição de acesso; proibição de ausentar-se; recolhimento domiciliar; etc." },
      { num: "321", titulo: "Liberdade provisória", texto: "Ausentes os requisitos da preventiva, o juiz deve conceder liberdade provisória, com ou sem fiança." },
      { num: "332", titulo: "Prazo do processo", texto: "O processo deve ter duração razoável, conforme pactos internacionais." },
      { num: "394", titulo: "Ritos processuais", texto: "Ritos: comum (ordinário, sumário, sumaríssimo); específicos (tribunal do júri, Lei 9.099, etc.)." },
      { num: "396", titulo: "Citação e resposta", texto: "Após recebimento da denúncia, o réu é citado e tem 10 dias para apresentar resposta à acusação." },
      { num: "396-A", titulo: "Resposta à acusação", texto: "Na resposta, o defensor pode arguir preliminares, demonstrar nulidades, pedir absolvição sumária, arrolar testemunhas." },
      { num: "397", titulo: "Absolvição sumária", texto: "O juiz pode absolver sumariamente quando: inexistência do fato; não constituir infração penal; demonstrada causa de exclusão; atípica." },
      { num: "400", titulo: "Ordem da instrução", texto: "Instrução: depoimento do ofendido, oitiva testemunhas acusação, oitiva testemunhas defesa, peritos, acareações, interrogatório, alegações finais." },
      { num: "401", titulo: "Testemunhas", texto: "Até 8 testemunhas no rito ordinário, 5 no sumário, 3 no JECrim." },
      { num: "403", titulo: "Alegações finais", texto: "Após a instrução, as partes têm 5 dias para alegações finais, podendo ser orais (20 min) ou memoriais escritos." },
      { num: "411", titulo: "Sentença", texto: "O juiz tem 10 dias para proferir sentença após as alegações finais." },
      { num: "413", titulo: "Pronúncia", texto: "Se há indícios de autoria e materialidade de crime doloso contra a vida, o juiz pronuncia o acusado para julgamento pelo júri." },
      { num: "415", titulo: "Impronúncia", texto: "Se não há indícios suficientes, o juiz impronuncia, podendo ser proposta nova denúncia se surgirem novas provas." },
      { num: "474", titulo: "Recusas no júri", texto: "Cada parte pode recusar até 3 jurados sem motivar, alternadamente, começando pela defesa." },
      { num: "483", titulo: "Questionário do júri", texto: "O júri responde a quesitos sobre materialidade, autoria, e se o jurado absolve ou condena." },
      { num: "492", titulo: "Sentença no júri", texto: "Se o veredicto é condenatório, o juiz fixa a pena. Se absolutório, determina a liberdade." },
      { num: "581", titulo: "RESE - rol taxativo", texto: "Cabimento do RESE: decisões interlocutórias listadas em 35 incisos. Fora do rol, cabe apelação." },
      { num: "593", titulo: "Apelação", texto: "Cabe apelação contra sentenças definitivas. No júri, só nas hipóteses do inciso III: nulidade posterior à pronúncia, sentença contrária à prova." },
      { num: "600", titulo: "Contrarrazões", texto: "Após interposição do recurso, a parte contrária tem 2 dias para contrarrazões." },
      { num: "619", titulo: "Embargos de declaração", texto: "Cabem embargos de declaração em 2 dias quando houver ambiguidade, obscuridade, contradição ou omissão." },
      { num: "621", titulo: "Revisão criminal", texto: "A revisão criminal pode ser pedida quando: sentença contrária à lei; fundada em prova falsa; novas provas de inocência." },
      { num: "647", titulo: "Habeas corpus", texto: "Dar-se-á habeas corpus sempre que alguém sofrer ou se achar na iminência de sofrer violência ou coação em sua liberdade de ir e vir." },
      { num: "648", titulo: "Hipóteses de HC", texto: "Coação ilegal: quando não houver justa causa; quando alguém estiver preso por mais tempo que a lei permite; quando o processo for manifestamente nulo; etc." },
      { num: "656", titulo: "Liminar em HC", texto: "O juiz pode conceder medida liminar em habeas corpus para suspender o constrangimento." },
    ],
  },
  CF: {
    nome: "Constituição Federal (1988)",
    artigos: [
      { num: "5º", titulo: "Direitos fundamentais", texto: "Todos são iguais perante a lei. Garante-se a inviolabilidade do direito à vida, liberdade, igualdade, segurança e propriedade." },
      { num: "5º, XI", titulo: "Inviolabilidade de domicílio", texto: "A casa é asilo inviolável do indivíduo, ninguém nela podendo penetrar sem consentimento do morador, salvo em flagrante delito ou desastre, ou para prestar socorro." },
      { num: "5º, XII", titulo: "Sigilo de comunicações", texto: "É inviolável o sigilo da correspondência e das comunicações telegráficas, de dados e das comunicações telefônicas, salvo ordem judicial." },
      { num: "5º, LVII", titulo: "Presunção de inocência", texto: "Ninguém será considerado culpado antes do trânsito em julgado de sentença penal condenatória." },
      { num: "5º, LVIII", titulo: "Identificação do acusado", texto: "O civilmente identificado não será submetido a identificação criminal, salvo nas hipóteses previstas em lei." },
      { num: "5º, LXI", titulo: "Prisão", texto: "Ninguém será preso senão em flagrante delito ou por ordem escrita e fundamentada de autoridade judiciária competente." },
      { num: "5º, LXII", titulo: "Comunicação da prisão", texto: "A prisão de qualquer pessoa e o local onde se encontre serão comunicados imediatamente ao juiz competente e à família do preso ou à pessoa por ele indicada." },
      { num: "5º, LXIII", titulo: "Direito ao silêncio", texto: "O preso será informado de seus direitos, entre os quais o de permanecer calado, sendo-lhe assegurada a assistência da família e de advogado." },
      { num: "5º, LXIV", titulo: "Assistência jurídica", texto: "O preso tem direito à identificação dos responsáveis por sua prisão ou por seu interrogatório policial." },
      { num: "5º, LXV", titulo: "Prisão ilegal", texto: "A prisão ilegal será imediatamente relaxada pela autoridade judiciária." },
      { num: "5º, LXVI", titulo: "Liberdade provisória", texto: "Ninguém será levado à prisão ou nela mantido, quando a lei admitir a liberdade provisória, com ou sem fiança." },
      { num: "5º, LXXIII", titulo: "Habeas corpus", texto: "Conceder-se-á habeas corpus sempre que alguém sofrer ou se achar ameaçado de sofrer violência ou coação em sua liberdade de locomoção, por ilegalidade ou abuso de poder." },
      { num: "5º, LXXIV", titulo: "Defensoria pública", texto: "O Estado prestará assistência jurídica integral e gratuita aos que comprovarem insuficiência de recursos." },
      { num: "5º, LXXVI", titulo: "Habeas data", texto: "Conceder-se-á habeas data para assegurar conhecimento ou retificação de informações pessoais." },
      { num: "5º, LXXVII", titulo: "Habeas corpus gratuito", texto: "São gratuitas as ações de habeas corpus e habeas data." },
      { num: "5º, LXXVIII", titulo: "Razoabilidade", texto: "A todos, no âmbito judicial e administrativo, são assegurados a razoável duração do processo e os meios que garantam a celeridade de sua tramitação." },
      { num: "93, IX", titulo: "Motivação das decisões", texto: "Todos os julgamentos dos órgãos do Poder Judiciário serão públicos, e fundamentadas todas as decisões, sob pena de nulidade." },
      { num: "102", titulo: "Competência STF", texto: "Compete ao Supremo Tribunal Federal julgar, em recurso extraordinário, as causas decididas em única ou última instância que contrariem a Constituição." },
      { num: "105", titulo: "Competência STJ", texto: "Compete ao Superior Tribunal de Justiça julgar, em recurso especial, as causas decididas em única ou última instância que contrariem tratado ou lei federal." },
    ],
  },
};

// Busca no Vade Mecum
function buscarVadeMecum(query) {
  if (!query || query.length < 2) return [];

  const normalized = query.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim();

  const terms = normalized.split(/\s+/).filter(t => t.length > 1);
  const results = [];

  for (const [codigo, dados] of Object.entries(VADE_MECUM)) {
    for (const art of dados.artigos) {
      const searchable = `${codigo} art. ${art.num} ${art.titulo || ""} ${art.texto}`
        .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      const score = terms.reduce((acc, term) => acc + (searchable.includes(term) ? 1 : 0), 0);
      if (score > 0) {
        results.push({
          codigo,
          codigoNome: dados.nome,
          num: art.num,
          titulo: art.titulo,
          texto: art.texto,
          score,
        });
      }
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 30);
}
