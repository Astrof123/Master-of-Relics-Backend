# ConfigModule

## ConfigService

```typescript
// Получить любое значение конфигурации по ключу (например, 'database.host')
get<T>(key: string): T

// Вернуть объект с настройками подключения к PostgreSQL
getDatabaseConfig(): { host, port, username, password, database }

// Вернуть объект с настройками подключения к Redis
getRedisConfig(): { host, port, password }

// Вернуть настройки JWT: секретный ключ, время жизни access/refresh токенов
getJwtConfig(): { secret, accessExpiry, refreshExpiry }

// Вернуть игровые балансовые параметры: базовую награду за матч, бонус за победу
getGameConfig(): { baseGoldReward, winBonus, roundDuration? }

```


# MetricsModule

## MetricsService

```typescript

// Увеличить счетчик метрики (например, 'game_sessions_active')
incrementCounter(metric: string, labels?: object)

// Записать значение в гистограмму (например, 'request_duration_ms', 150)
recordHistogram(metric: string, value: number, labels?: object)

// Сгенерировать данные в формате Prometheus для эндпоинта /metrics
getMetrics(): string

```


## MetricsController 

```typescript

@Get('/metrics') // Отдать метрики в формате Prometheus
getMetrics(): string

```


# EventsModule

## EventsService

```typescript
// Отправить событие всем подписчикам (например, 'match.finished', {sessionId})
emit(event: string, data: any)

// Подписаться на событие
on(event: string, handler: Function)

// Отписаться от события
removeListener(event: string, handler: Function)

```

# AuthModule

## AuthController

```typescript

@Post('/register') // Регистрация с инвайт-кодом
register(registerDto: RegisterDto): { user, tokens }

@Post('/login') // Вход по логину/паролю
login(loginDto: LoginDto): { user, tokens }

@Post('/logout') // Выход (инвалидация refresh токена)
logout(logoutDto: LogoutDto): void

@Post('/refresh') // Обновление токенов
refresh(refreshDto: RefreshTokenDto): { accessToken, refreshToken }

```


## AuthService

```typescript

// Зарегистрировать нового пользователя. Проверить инвайт-код, захешировать пароль, создать запись в БД
register(email: string, password: string, inviteCode: string): { user, tokens }

// Аутентифицировать пользователя: проверить email/пароль, сгенерировать токены
login(email: string, password: string): { user, tokens }

// Добавить refresh токен в черный список (для выхода)
logout(userId: string, refreshToken: string): void

// Выдать новую пару токенов по валидному refresh токену
refreshTokens(refreshToken: string): { accessToken, refreshToken }

// Проверить email и пароль, вернуть пользователя если ок
validateUser(email: string, password: string): User | null

```


## JwtService

```typescript

// Создать JWT токен с payload
sign(payload: object, type: 'access' | 'refresh'): string

// Проверить подпись и срок действия токена, вернуть payload
verify(token: string, type: 'access' | 'refresh'): any

// Распарсить токен без проверки подписи (только для чтения данных)
decode(token: string): any

```


# UsersModule

## UsersController 

```typescript

@Get('/profile') // Получить свой профиль
getProfile(@Req() req): UserProfileDto

@Patch('/profile') // Обновить профиль (никнейм)
updateProfile(@Req() req, updateDto: UpdateProfileDto): UserProfileDto

```


## UsersService

```typescript

// Создать нового пользователя (вызывается из AuthService)
create(userData: Partial<User>): User

// Найти пользователя по ID
findById(id: string): Promise<User>

// Найти пользователя по логину
findByLogin(login: string): Promise<User>

// Обновить данные пользователя (никнейм, аватарку)
update(id: string, updateData: Partial<User>): Promise<User>

// Удалить пользователя (мягкое удаление)
delete_user(id: string): Promise<void>

```


# PhaseModule

## PhaseService

```typescript

// Инициализировать фазу бесплатной расстановки: разрешить игрокам двигать артефакты
newRound(sessionId: string): void

// Поменять фазу игры
changePhase(sessionId: string, phase: PhaseType): void

// Проверить закончили ли раунд игроки
arePlayersEndRounds(sessionId: string): boolean

```

## FreeSetupService

```typescript

// Обработать запрос на перестановку артефакта между линиями (бесплатно в начале раунда)
processSwapRequest(sessionId: string, playerId: string, artifactId: string, newLine: LineType, newPosition: int): boolean

// Игрок подтвердил готовность расстановки
confirmSetupReady(sessionId: string, playerId: string): boolean

// Игрок отменил готовность расстановки
confirmSetupCancel(sessionId: string, playerId: string): boolean

// Оба игрока подтвердили готовность?
isSetupComplete(sessionId: string): boolean

```


# DraftModule

## DraftSessionService

```typescript

// Зафиксировать предвыбор игрока
recordPick(sessionId: string, playerId: string, artifactId: string): boolean

// Зафиксировать окончательно выбор игрока
confirmPick(sessionId: string, playerId: string): boolean

// Отменить выбор игрока
cancelPick(sessionId: string, playerId: string): boolean

// Все игроки выбрали по 7 артефактов?
arePicksComplete(sessionId: string): boolean

// Проверить доступна ли карта для выбора (не выбрана ранее)
validatePickAvailability(sessionId: string, artifactId: string): boolean

// Оба игрока подтвердили готовность выбора артефакта?
isDraftOneCardComplete(sessionId: string): boolean

```


# ActionModule

## TurnEngineService

```typescript

// Начать ход игрока: установить текущего игрока, сбросить счетчик действий
startTurn(sessionId: string, playerId: string): void

// Завершить ход текущего игрока, передать ход другому
endTurn(sessionId: string): void

// Завершить раунда для текущего игрока, передать ход другому
endRound(sessionId: string): void

// Кто сейчас ходит?
getCurrentPlayer(sessionId: string): string

// Есть ли у игрока доступные очки действия?
hasActionsPoints(sessionId: string, playerId: string): boolean

// Использовать одно основное действие (кубик/заклинание/способность)
consumeMainAction(sessionId: string, playerId: string, actionType: ActionType, targetIds: string[]): void

// Получить все доступные игроку действия
getAllPlayerActions(sessionId: string, playerId: string): ActionType[]

```


## ActionValidatorService

```typescript

// Проверить можно ли использовать кубик артефакта: фаза ходов, ход игрока, артефакт жив, не использован, нет оглушения
validateDiceUse(sessionId: string, playerId: string, artifactId: string): ValidationResult

// Проверить можно ли кастовать заклинание: есть в спеллбуке, хватает маны, не использовано в раунде
validateSpellCast(sessionId: string, playerId: string, spellId: string, targetId?: string): ValidationResult

// Проверить можно ли активировать способность: артефакт готов, хватает ярости
validateAbilityUse(sessionId: string, playerId: string, artifactId: string, abilityId: string): ValidationResult

// Проверить можно ли потратить ловкость: хватает ловкости, цель валидна (для переброса кубика и т.д.)
validateAgilitySpend(sessionId: string, playerId: string, actionType: ActionType, targetId?: string): ValidationResult

```


## ActionResolverService

```typescript

// Выполнить использование кубика: пометить как использованный, применить эффект грани
resolveDiceUse(sessionId: string, playerId: string, artifactId: string): ActionResult

// Выполнить каст заклинания: потратить ману, применить эффект заклинания
resolveSpellCast(sessionId: string, playerId: string, spellId: string, targetId?: string): ActionResult

// Выполнить активацию способности: потратить ярость, применить эффект способности
resolveAbilityUse(sessionId: string, playerId: string, artifactId: string, abilityId: string): ActionResult

// Выполнить трату ловкости: списать ловкость, выполнить эффект (переброс, доп действие и т.д.)
resolveAgilitySpend(sessionId: string, playerId: string, actionType: ActionType, targetId?: string): ActionResult

```


# GameStateModule

## GameStateService

```typescript

// Создать новую игровую сессию из комнаты, сохранить в Redis
createSessionState(roomId: string, player1Id: string, player2Id: string): GameState

// Получить состояние сессии из Redis
getSessionState(sessionId: string): GameState

// Получить состояние игрока сессии из Redis
getPlayerState(sessionId: string, playerId: string): PlayerState

// Получить состояние противника сессии из Redis
getEnemyState(sessionId: string, playerId: string): PlayerState

// Обновить состояние сессии в Redis (атомарно)
updateSessionState(sessionId: string, updates: Partial<GameState>): void

// Удалить сессию из Redis (при завершении)
deleteSessionState(sessionId: string): void

// Найти все активные сессии игрока (для реконнекта)
findSessionsByPlayer(playerId: string): GameState[]


```

# ResourceModule

## ResourceService

```typescript

// Получить текущие ресурсы игрока: { mana: 5, rage: 3, agility: 2.5 }
getResources(sessionId: string, playerId: string): PlayerResources

// Добавить ресурсы (при выпадении граней кубика или с помощью способностей и заклинаний)
addResource(sessionId: string, playerId: string, type: ResourceType, amount: number): void

// Потратить ресурсы (проверяя что хватает)
spendResource(sessionId: string, playerId: string, type: ResourceType, amount: number): boolean

// Проверить наличие нескольких ресурсов сразу: [{type: 'rage', amount: 2}, {type: 'agility', amount: 1}]
hasResources(sessionId: string, playerId: string, requirements: ResourceRequirement[]): boolean

// Добавить ресурсы в новом раунде
addResourceNewRound(sessionId: string): boolean

```


## AgilityExpenditureService

```typescript

// Можно ли потратить 0.5 ловкости на переброс этого кубика? (кубик не использован)
canRerollDice(sessionId: string, playerId: string, artifactId: string): boolean

// Потратить 0.5 ловкости на переброс
spendForReroll(sessionId: string, playerId: string, artifactId: string): boolean

// Можно ли потратить 1 ловкость на дополнительное действие?
canTakeExtraAction(sessionId: string, playerId: string): boolean

// Потратить 1 ловкость на доп действие
spendForExtraAction(sessionId: string, playerId: string): boolean

// Можно ли потратить 1 ловкость на смену линии артефактом? (артефакт жив, не в начале раунда)
canSwapLine(sessionId: string, playerId: string, artifactId: string): boolean

// Потратить 1 ловкость на смену линии
spendForLineSwap(sessionId: string, playerId: string, artifactId: string): boolean

// Можно ли потратить 3 ловкости на снятие безмолвия?
canRemoveSilence(sessionId: string, playerId: string): boolean

// Потратить 3 ловкости на снятие безмолвия
spendForSilenceRemoval(sessionId: string, playerId: string): boolean

```


# CombatEngineModule

## DiceService

```typescript

// Бросить кубики для всех живых артефактов в начале раунда
rollAllDices(sessionId: string): DiceRollResults

// Перебросить конкретный кубик (по запросу игрока за ловкость)
rerollSingleDice(sessionId: string, artifactId: string): DiceFace

```



## CombatCalculatorService

```typescript

// Рассчитать итоговый урон: базовый урон + бонус линии (+1 к ближнему на передней) - защиты
calculateDamage(attackerId: string, targetId: string, damageType: DamageType, baseDamage: number): number

// Применить урон к артефакту, проверить не уничтожен ли
applyDamage(sessionId: string, targetId: string, damage: number): boolean

// Восстановить HP артефакту (не выше максимума)
applyHealing(sessionId: string, targetId: string, amount: number): boolean


```

## ExtraFunctionsService

```typescript

// Проверка может ли артефакт атаковать
canArtifactAttackTarget(sessionId: string, targetId: string, artifactId: string): void

// Получить все действия артефакта
getAllActionForArtifact(sessionId: string, artifactId: string): void

```

## ArtifactStateService

```typescript

// Наложить статус на артефакт: например "Оглушение" на 1 раунд
applyState(sessionId: string, targetId: string, status: ArtifactState): void

// Проверить какое состояние у артефакта
hasState(sessionId: string, targetId: string): boolean

// Получить состояние артефакта
getState(sessionId: string, targetId: string): ArtifactState

// Обновить состояния предметов в новом раунде
updateStateNewRound(sessionId: string): void

```

## GameEffectsService

```typescript

// Наложить эффект на артефакт
applyEffect(sessionId: string, targetId: string, status: EffectType): void

// Снять эффект 
removeEffect(sessionId: string, targetId: string, status: EffectType): void

// Проверить есть ли эффект у артефакта
hasEffect(sessionId: string, targetId: string, status: EffectType): boolean

// Получить все активные эффекты артефакта
getEffects(sessionId: string, targetId: string): EffectType[]

// Обновить эффекты артефактов в новом раунде
updateEffectsNewRound(sessionId: string): EffectType[]

// Активировать эффект артефакта
activateArtifactEffect(sessionId: string): 
```


# ArtifactsModule

## ArtifactsController  

```typescript

@Get('/artifacts') // Получить список всех артефактов
getAllArtifacts(): ArtifactDto[]

```


## ArtifactsStaticDataService

```typescript

// Получить статические данные артефакта: название, описание, максимальное HP, тип
getArtifactData(artifactId: string): ArtifactData

// Получить описание всех 6 граней кубика для этого артефакта
getArtifactDiceFaces(artifactId: string): DiceFace[]

// Получить описание конкретной способности артефакта: стоимость, эффект
getArtifactAbility(artifactId: string): ArtifactAbility

```

## ArtifactsService

```typescript

// Применить способности артефактов, которые срабатывают в начале раунда
useArtifactsSkillsNewRound(): ArtifactData


```


# SpellsModule

## SpellsController   

```typescript

@Get('/spells') // Получить список всех заклинаний
getAllSpells(): SpellDto[]

```

## SpellsStaticDataService

```typescript

// Получить статические данные заклинания: название, описание, иконка
getSpellData(spellId: string): SpellData

// Получить стоимость заклинания в мане
getSpellCost(spellId: string): number

```

## SpellsService

```typescript

// Реализация заклинаний

```

## SpellRegistry

```typescript

// Зарегистрировать все заклинания
registerAll(): void

getSpellById(): void

```



# RoomsModule

## RoomsService

```typescript

// Создать комнату: публичную или приватную с кодом
createRoom(creatorId: string, settings: RoomSettings): Room

// Получить информацию о комнате
getRoom(roomId: string): Room

// Присоединиться к комнате: проверить пароль/код, не полна ли
joinRoom(roomId: string, playerId: string, inviteCode?: string): boolean

// Покинуть комнату (если вышел последний - удалить комнату)
leaveRoom(roomId: string, playerId: string): void

// Получить список всех публичных комнат для отображения в лобби
listRooms(playerId): Room[]

// Принудительно удалить комнату (таймаут)
deleteRoom(roomId: string): void

// Сгенерировать 6-значный инвайт-код для приватной комнаты
generateInviteCode(roomId: string): string

// Сгенерировать ссылку на игру
generateLinkForGame(roomId: string): string

```


## RoomGateway (WebSocket Gateway)

```typescript

// Обработчики событий от клиента:
@SubscribeMessage('ROOM_JOIN')   // Присоединиться
@SubscribeMessage('ROOM_LEAVE')  // Покинуть
@SubscribeMessage('ROOM_READY')  // Отметить готовность
@SubscribeMessage('ROOM_CANCEL')  // Отменить готовность
@SubscribeMessage('ROOM_INVITE') // Пригласить друга

// Обработчики событий от сервера:
@SubscribeMessage('ROOM_LIST')   // Список комнат
@SubscribeMessage('ROOM_INVITE_CONFIRM') // Получение приглашения

// События соединения/разрыва
handleConnection(client: Socket)
handleDisconnect(client: Socket)

```


## GameGatewaySessionManager

```typescript

// Привязать сокет к пользователю и сессии
registerConnection(client: Socket, userId: string, sessionId?: string)

// Удалить привязку при отключении
unregisterConnection(clientId: string)

// Получить ID сессии для сокета
getSessionId(client: Socket): string | null

// Получить ID пользователя для сокета
getUserId(client: Socket): string | null

// Получить все сокеты в сессии (для рассылки)
getClientsInSession(sessionId: string): Socket[]

```


# CollectionModule

## CollectionController   

```typescript

@Get('/collection') // Получить всю коллекцию игрока
getCollection(@Req() req): CollectionDto

```


## CollectionService

```typescript

// Получить всю коллекцию игрока: какие артефакты и заклинания у него есть
getUserCollection(userId: string): CollectionItem[]

// Добавить предмет в коллекцию (после покупки или награды)
addToCollection(userId: string, itemId: string, itemType: 'artifact' | 'spell'): void

// Удалить предмет из коллекции (редкая операция)
removeFromCollection(userId: string, itemId: string): boolean

// Проверить есть ли у игрока конкретный предмет
hasItem(userId: string, itemId: string): boolean

// Сколько всего предметов у игрока (для статистики)
getCollectionSize(userId: string): { artifacts: number, spells: number }

```


# DeckBuildingModule

## DeckController   

```typescript

@Get('/deck') // Получить текущую колоду (16 артефактов)
getDeck(@Req() req): DeckDto

@Put('/deck') // Обновить колоду
updateDeck(@Req() req, @Body() deckDto: UpdateDeckDto): DeckDto

@Get('/spellbook') // Получить текущий спеллбук (6 заклинаний)
getSpellbook(@Req() req): SpellbookDto

@Put('/spellbook') // Обновить спеллбук
updateSpellbook(@Req() req, @Body() spellbookDto: UpdateSpellbookDto): SpellbookDto

```


## DeckService

```typescript

// Получить колоду игрока (массив из 16 ID артефактов)
getDeck(userId: string): string[]

// Обновить колоду: проверить что все артефакты есть в коллекции, сохранить
updateDeck(userId: string, artifactIds: string[]): boolean

// Проверить валидность колоды: ровно 16 уникальных артефактов из коллекции
validateDeck(artifactIds: string[]): { isValid: boolean, errors: string[] }

// Есть ли артефакт в колоде? (для UI)
isArtifactInDeck(userId: string, artifactId: string): boolean

```





# ShopModule 

## ShopController   

```typescript

@Get('/shop/catalog') // Получить каталог товаров
getCatalog(@Req() req): ShopCatalogDto

@Post('/shop/purchase') // Купить предмет
purchaseItem(@Req() req, @Body() purchaseDto: PurchaseDto): PurchaseResultDto

@Post('/shop/validate') // Предварительная проверка покупки
validatePurchase(@Req() req, @Body() validateDto: ValidatePurchaseDto): ValidationResultDto

```

## ShopService

```typescript

// Получить весь каталог товаров (артефакты и заклинания доступные для покупки)
getCatalog(userId: string): ShopItem[]

// Получить цену конкретного предмета
getItemPrice(itemId: string): number

// Доступен ли предмет для покупки?
isItemAvailable(itemId: string): boolean

```


## TransactionService

```typescript

// Совершить покупку: проверить баланс, списать золото, добавить в коллекцию
purchaseItem(userId: string, itemId: string): TransactionResult

// Предварительная проверка: хватает ли денег, есть ли уже предмет?
validatePurchase(userId: string, itemId: string): ValidationResult

```


# ProgressModule

## GoldService

```typescript

// Рассчитать награды за матч: базовая награда + бонус за победу
calculateMatchRewards(sessionId: string, winnerId: string): MatchRewards

// Распределить награды между игроками: добавить золото на счета
distributeRewards(sessionId: string): void

// Получить текущий баланс золота игрока
getPlayerBalance(userId: string): number

// Добавить золото (для наград или админских операций)
addGold(userId: string, amount: number): void

// Списать золото (для покупок), проверив что хватает
deductGold(userId: string, amount: number): boolean

```


# FriendsModule

## FriendsController 

```typescript

@Get('/friends') // Получить список друзей
getFriends(@Req() req): FriendDto[]

@Get('/friends/requests') // Получить заявки в друзья
getFriendRequests(@Req() req): FriendRequestDto[]

@Post('/friends/requests/send') // Отправить заявку в друзья
sendFriendRequest(@Req() req, @Body() requestDto: SendFriendRequestDto): boolean

@Post('/friends/requests/:id/accept') // Принять заявку
acceptFriendRequest(@Param('id') requestId: string, @Req() req): boolean

@Post('/friends/requests/:id/reject') // Отклонить заявку
rejectFriendRequest(@Param('id') requestId: string, @Req() req): boolean

@Delete('/friends/:id') // Удалить из друзей
removeFriend(@Param('id') friendId: string, @Req() req): void

@Get('/users/search') // Поиск пользователей по никнейму
searchUsers(@Query('nickname') nickname: string): UserSearchResultDto[]

```

## FriendsService

```typescript

// Отправить заявку в друзья: проверить не отправил ли уже, не в друзьях ли
sendFriendRequest(senderId: string, recipientId: string): boolean

// Принять заявку: добавить в списки друзей обоих игроков
acceptFriendRequest(requestId: string): boolean

// Отклонить заявку: удалить запись о заявке
rejectFriendRequest(requestId: string): boolean

// Удалить из друзей: убрать из списков обоих игроков
removeFriend(userId: string, friendId: string): void

// Получить входящие и исходящие заявки
getPendingRequests(userId: string): FriendRequest[]

// Поиск пользователей по части никнейма (автодополнение)
searchByNickname(nickname: string): Promise<User[]>

```


# AdminModule

## AdminUsersController 

```typescript

@Get('/users') // Получить список всех пользователей
getAllUsers(@Query() pagination: PaginationDto): AdminUserListDto

@Get('/users/:id') // Получить детальную информацию о пользователе
getUserDetails(@Param('id') id: string): AdminUserDetailsDto

@Patch('/users/:id/ban') // Забанить/разбанить пользователя
banUser(@Param('id') id: string, @Body() banDto: BanUserDto): void

```

## InviteService

```typescript

// Сгенерировать уникальный 8-значный код, сохранить в БД
generateInviteCode(): string

// Проверить существует ли код и не использован ли он
validateInviteCode(code: string): boolean

// Получить все коды (для админа)
getInviteCodes(): string[]

// Удалить код
deleteInviteCodes(): string[]

```


## AdminGamesController  

```typescript

@Get('/sessions') // Получить активные игровые сессии
getActiveSessions(): GameSessionDto[]

@Get('/sessions/:id') // Получить детали сессии
getSessionDetails(@Param('id') id: string): GameSessionDetailsDto

@Delete('/sessions/:id') // Принудительно завершить сессию
forceEndSession(@Param('id') id: string): void

```


## AdminService

```typescript

// Получить список всех пользователей с пагинацией
getAllUsers(pagination: PaginationParams): User[]

// Получить детальную информацию о пользователе: статистика, последние матчи
getUserDetails(userId: string): AdminUserDetails

// Забанить пользователя: установить флаг ban, записать причину
banUser(userId: string, reason: string): void

// Разбанить пользователя
unbanUser(userId: string): void

// Получить все активные игровые сессии
getActiveSessions(): GameSession[]

// Принудительно завершить сессию (при проблемах)
forceEndSession(sessionId: string): void

// Сгенерировать N инвайт-кодов для админа
generateInviteCodes(count: number, createdBy: string): string[]

// Получить статистику по играм: кол-во матчей, средняя длительность
getGameStatistics(timeRange: TimeRange): GameStatistics

```


# AnalyticsModule

## AnalyticsController

```typescript

@Get('/analytics/artifacts') // Статистика по артефактам
getArtifactAnalytics(@Query() timeRange: TimeRangeDto): ArtifactAnalyticsDto

@Get('/analytics/spells') // Статистика по заклинаниям
getSpellAnalytics(@Query() timeRange: TimeRangeDto): SpellAnalyticsDto

@Get('/analytics/game-stats') // Общая статистика игр
getGameStatistics(@Query() timeRange: TimeRangeDto): GameStatisticsDto

```


## AnalyticsService

```typescript

// Получить статистику выбора артефактов (% от всех матчей)
getArtifactPickRate(timeRange: TimeRange): PickRateData[]

// Получить винрейт артефактов (в каких матчах выигрывали)
getArtifactWinRate(timeRange: TimeRange): WinRateData[]

// Получить метрики баланса: средняя длительность матча, % сдач
getGameBalanceMetrics(timeRange: TimeRange): BalanceMetrics

```