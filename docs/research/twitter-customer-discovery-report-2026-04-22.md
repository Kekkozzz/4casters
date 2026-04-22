# Customer Discovery Report - Twitter Thread Analysis
## AI Caster Prep Tool for Rocket League
**Data:** 22 aprile 2026
**Fonte:** Thread X/Twitter di @kekkozrl + quote tweet e conversazioni derivate
**Metriche thread:** ~41.400 visualizzazioni sul post originale

---

## 1. Validazione del problema

Il problema **esiste**, ma e segmentato per livello di evento e compenso:

| Segmento | Prep attuale | Target tool |
|---|---|---|
| **Top tier (RLCS)** | Ha Derek Nilsen (@dRektRL) come data person dedicato | Non target - gia risolto |
| **Mid tier (IRC, paid gigs)** | 3-5h manuali, file aggiornati matchday per matchday | **Target principale** |
| **Low tier (volunteer)** | Nessuna prep, non prepperanno mai | Non target - non pagheranno |

**Conclusione chiave:** Il tool non compete con Derek - lo democratizza per chi non puo permetterselo. Positioning: "Derek-as-a-service per il mid-tier".

---

## 2. Workflow reale dei caster (confermato da piu fonti)

### Fonti dati usate
- **Liquipedia** - storie, team, player, H2H (universale, usata da tutti)
- **BLAST** - stats team e player (con gap noti: Save per shot, demos/bumps in GPAR%)
- **Quotes** - interviste, documentari, tweet (fonte piu dispersa, mai aggregata in un unico posto)
- **Match review** - VOD del precedente H2H quando c'e preavviso

### Tempo di prep per segmento
| Chi | Tempo | Contesto |
|---|---|---|
| @LifeIsCoolBRO | 15min - 2h | Giornaliero, multiple bracket rounds |
| @IRC_MrTristan | 2-3h giorno prima + 1-2h event day | IRC |
| @Dr_Kuma_ | File narrativo completo aggiornato per matchday | IRC |
| @psychoxistence | 30 min | Cast grandi |
| @SpooksIRL | 30 min - 2h | Broadcast grandi |
| @ZenZeroTTV | 20 min (se conosce la scena) | Dipende dal compenso |
| @BryanCR66 | 30 min | Amateur, 2 anni esperienza |
| @SteliosE11 | 15 min per player | RLCS teams |

### Dinamica chiave
Il tempo si riduce con l'esperienza accumulata (compounding knowledge). Confermato da @MonkeyshinesTV ("build for the future") e @IRC_MrTristan ("reducing over time").

---

## 3. Pain point validato

> "Not replacing the research, just the tab-hopping"

I dati **esistono gia** su Liquipedia. Il problema e che la cross-player information (ex-compagni, rivalita, storie incrociate) richiede 10+ pagine da visitare manualmente.

**Questo e l'unico punto che nessuno ha contestato nel thread.**

### Pain point secondari
- **Quotes dispersi** (interviste, documentari, tweet) - nessun aggregatore esiste
- **Gap di BLAST** - metriche mancanti (Save per shot, demos/bumps in GPAR%)
- **File manuali** da aggiornare matchday dopo matchday (IRC)

---

## 4. Lezioni per il design del prodotto

### Architettura (da @Shiger_Tark_, @dRektRL)
- **Data layer = deterministico**, scraping diretto da Liquipedia come source of truth
- **AI = solo synthesis layer**, mai lookup di dati fattuali
- Rischio specifico: confusione tra nomi simili (Atomic/Atomik/Aztromick, Deevo/Dvo, Diaz/Diaz) - da ingegnerizzare nel data layer

### Output format (da @LeShoeGG, @Jay_rl_)
- **Less is more**: 3-4 narrative hooks curati > data dump completo
- Formato ideale: stat curata e contestualizzata ("questo giocatore ha il piu alto GPG dell'evento")
- Le stats devono **supportare la narrativa, non rimpiazzarla**
- "Having all the data is bad for their work" - @LeShoeGG

### Segmentazione per ruolo (da @Liefx)
- **Host/interviewer** - qualitativo, "how they said it" (non automatizzabile con testo)
- **Caster/analyst** - quantitativo, dati strutturati (qui c'e il valore del tool)

---

## 5. Obiezioni raccolte e risposte

| Obiezione | Chi | Risposta |
|---|---|---|
| "Non-problem" | @dRektRL, @RocketYota | Confutato dai dati del thread: LifeIsCool, Kuma, MrTristan preppano seriamente |
| "AI troppo inaccurata" | @dRektRL, @Shiger_Tark_ | Architettura: Liquipedia come source of truth, AI non inventa dati |
| "Scorciatoia per chi non studia" | @iDazerin, @RocketYota | Chi non studia lo fa gia senza tool |
| "ChatGPT fa la stessa cosa" | @Cardinals55rl | No: ChatGPT non ha accesso real-time a Liquipedia/BLAST |
| "Il processo di ricerca ha valore intrinseco" | @RocketYota, @MonkeyshinesTV | Valido per l'analisi, non per il tab-hopping meccanico |
| "Non serve AI, serve un bot/algoritmo" | @Shiger_Tark_ | Punto valido sull'architettura, incorporato nel design |

---

## 6. Mappa degli stakeholder

### Alleati pubblici (da nutrire)
- **@MonkeyshinesTV** - "AI is great for this, go nuts" + angolo compounding knowledge
- **@StarCoreYT** - "if accurate, makes their lives easier"
- **@LifeIsCoolBRO** - workflow dettagliato condiviso, potenziale early adopter
- **@IRC_MrTristan** - caster IRC italiano, gia interlocutore diretto
- **@psychoxistence** - "Sounds really helpful!"
- **@BryanCR66** - amateur con prep costante, open

### Skeptics credibili (da trasformare in consulenti)
- **@dRektRL (Derek Nilsen)** - fornisce dati a rlesports, conosce i gap meglio di chiunque. Alto valore come advisor.
- **@Liefx (Brody Moore)** - host RLCS, ha gia provato a costruire AI tools, sa cosa non funziona
- **@LeShoeGG (Ben Shuman)** - stats nerd + commentator, insight chiave sul formato output

### Skeptics ideologici (ignorare)
- @_chaotix, @imroachinghere, @SleepLessPlays, @Pedro_Pascoa, @riksharduz - anti-AI generico senza argomentazioni

---

## 7. Domande aperte ad alto valore

Tre conversazioni da continuare che possono sbloccare insight critici:

1. **@Liefx** - "I've tried building my own AI tools" - Cosa ha costruito? Perche non ha funzionato? Quali limiti ha trovato?
2. **@LeShoeGG** - Come sarebbe l'output ideale curato per un match specifico? Formato e granularita.
3. **@dRektRL** - Quali sono i gap di accuratezza nei dati RL attuali? Cosa manca a Liquipedia/BLAST?

### Domande secondarie
- @LifeIsCoolBRO - Quanto tempo va nella ricerca quotes vs data lookup?
- @ZenZeroTTV - Nei gig "paid well", cosa fa in piu rispetto ai 20 min di Liquipedia?
- @IRC_MrTristan - Nelle 2-3h del giorno prima, cosa occupa piu tempo?

---

## 8. Lezioni strategiche

### Credibilita nella customer discovery
- Confermare pubblicamente di usare AI per rispondere (@MockingJay_rl) ha dato munizioni ai critici
- La risposta "It's called progress" a @DCFCGeorge_RL era controproducente
- **Per il futuro:** risposte piu brevi e personali, distinzione tra AI come assistente vs generatore

### Positioning consigliato
**Non:** "Tool che fa il prep al posto tuo"
**Si:** "Derek-as-a-service per il mid-tier" - aggregazione automatica di Liquipedia + stats, narrative hooks curati, nessuna hallucination

### Differenziazione da ChatGPT/Gemini
- Accesso real-time a Liquipedia e BLAST (ChatGPT non lo ha)
- Data layer deterministico (nessuna hallucination su roster/nomi)
- Output curato per casting (3-4 narrative hooks, non un saggio)
- Knowledge compounding nel tempo (non one-shot)

---

## 9. Prossimi passi consigliati

1. **Rispondere ai commenti prioritari** non ancora gestiti (Liefx, dRektRL, LifeIsCool, Shoe, ZenZer0)
2. **DM a Liefx** per approfondire i suoi esperimenti AI
3. **DM a Derek** per capire i gap di dati attuali e posizionarlo come advisor
4. **Prototipo MVP** focalizzato su: cross-player aggregation da Liquipedia -> one-sheet con 3-4 narrative hooks per match
5. **Test con MrTristan e Kuma** come beta tester su prossimo evento IRC
