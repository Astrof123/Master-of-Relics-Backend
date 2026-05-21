import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository, QueryRunner, EntityManager, SelectQueryBuilder } from 'typeorm';
import { CollectionService } from './collection.service';
import { UsersService } from '../users/users.service';
import { Card } from './entities/card.entity';
import { UserCollection } from './entities/collection.entity';
import { User } from '../users/entities/user.entity';
import {
    CardAlreadyExistException,
    CardNotForSaleException,
    CardNotFoundException,
    NotEnoughGoldException,
} from './exceptions/collection.exception';
import { UserNotFoundException } from '../users/exceptions/users.exception';
import { DEFAULT_COLLECTION } from './constants/default_collection';
import { ARTIFACTS } from '../artifact/constants/artifacts';
import { SKILLS } from '../artifact/constants/skills';

jest.mock('../artifact/constants/artifacts');
jest.mock('../artifact/constants/skills');

const mockArtifacts = {
    'arcane_shield': { id: 'arcane_shield', hp: 30, type: 'defense', skills: ['shield'], price: 100, isForSale: true },
    'moon_staff': { id: 'moon_staff', hp: 25, type: 'magic', skills: ['heal'], price: 150, isForSale: true },
    'axe_of_the_berserker': { id: 'axe_of_the_berserker', hp: 40, type: 'attack', skills: ['rage'], price: 200, isForSale: true },
    'ring_of_light': { id: 'ring_of_light', hp: 20, type: 'support', skills: null, price: 80, isForSale: true },
};

const mockSkills = {
    'shield': { cost: 2 },
    'heal': { cost: 3 },
    'rage': { cost: 1 },
};

describe('CollectionService', () => {
    let service: CollectionService;
    let dataSource: jest.Mocked<DataSource>;
    let collectionRepository: jest.Mocked<Repository<UserCollection>>;
    let cardRepository: jest.Mocked<Repository<Card>>;
    let usersService: jest.Mocked<UsersService>;

    const mockCollectionRepository = {
        find: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
    };

    const mockCardRepository = {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
    };

    const mockUsersService = {
        findOne: jest.fn(),
    };

    const createMockQueryRunner = (): jest.Mocked<QueryRunner> => {
        const mockQueryBuilder = {
            setLock: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getOne: jest.fn(),
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
        } as unknown as jest.Mocked<SelectQueryBuilder<any>>;

        const mockEntityManager = {
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
        } as unknown as jest.Mocked<EntityManager>;

        return {
            connect: jest.fn().mockResolvedValue(undefined),
            startTransaction: jest.fn().mockResolvedValue(undefined),
            commitTransaction: jest.fn().mockResolvedValue(undefined),
            rollbackTransaction: jest.fn().mockResolvedValue(undefined),
            release: jest.fn().mockResolvedValue(undefined),
            manager: mockEntityManager,
            connection: {} as any,
            broadcaster: {} as any,
            isReleased: false,
            isTransactionActive: false,
            isTransactionFailed: false,
            getConnection: jest.fn(),
            query: jest.fn(),
            escape: jest.fn(),
            createQueryRunner: jest.fn(),
            hasMetadata: jest.fn(),
            getMetadata: jest.fn(),
            getRepository: jest.fn(),
            getTreeRepository: jest.fn(),
            getMongoRepository: jest.fn(),
            getCustomRepository: jest.fn(),
            releaseConnection: jest.fn(),
            getDatabaseName: jest.fn(),
            getNow: jest.fn(),
            getTableName: jest.fn(),
            getTablePath: jest.fn(),
            getSchemaName: jest.fn(),
            getCurrentSchema: jest.fn(),
            clearSqlMemory: jest.fn(),
            executeMemoryDownSql: jest.fn(),
            dropDatabase: jest.fn(),
            createDatabase: jest.fn(),
            createSchema: jest.fn(),
            dropSchema: jest.fn(),
            enableSchemaSync: jest.fn(),
            disableSchemaSync: jest.fn(),
            getTable: jest.fn(),
            getTables: jest.fn(),
            getView: jest.fn(),
            getViews: jest.fn(),
            getMaterializedView: jest.fn(),
            getMaterializedViews: jest.fn(),
        } as unknown as jest.Mocked<QueryRunner>;
    };

    const mockDataSource = {
        createQueryRunner: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        
        (ARTIFACTS as any) = mockArtifacts;
        (SKILLS as any) = mockSkills;

        mockDataSource.createQueryRunner.mockReturnValue(createMockQueryRunner());
        
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CollectionService,
                {
                    provide: DataSource,
                    useValue: mockDataSource,
                },
                {
                    provide: getRepositoryToken(UserCollection),
                    useValue: mockCollectionRepository,
                },
                {
                    provide: getRepositoryToken(Card),
                    useValue: mockCardRepository,
                },
                {
                    provide: UsersService,
                    useValue: mockUsersService,
                },
            ],
        }).compile();

        service = module.get<CollectionService>(CollectionService);
        dataSource = module.get(DataSource);
        collectionRepository = module.get(getRepositoryToken(UserCollection));
        cardRepository = module.get(getRepositoryToken(Card));
        usersService = module.get(UsersService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createForNewUser', () => {
        const userId = 'user-123';

        it('should create default collection for new user', async () => {
            const mockCards = DEFAULT_COLLECTION.map((artifact, index) => ({
                id: index + 1,
                innerCardId: artifact,
            }));

            mockCardRepository.findOne.mockImplementation(({ where: { innerCardId } }: any) => {
                const card = mockCards.find(c => c.innerCardId === innerCardId);
                return Promise.resolve(card as Card);
            });

            mockCollectionRepository.create.mockImplementation((data) => data as UserCollection);
            mockCollectionRepository.save.mockResolvedValue({} as UserCollection);

            await service.createForNewUser(userId);

            expect(mockCardRepository.findOne).toHaveBeenCalled();
            expect(mockCollectionRepository.create).toHaveBeenCalled();
            expect(mockCollectionRepository.save).toHaveBeenCalled();
        });

        it('should skip if card not found', async () => {
            mockCardRepository.findOne.mockResolvedValue(null);

            await service.createForNewUser(userId);

            expect(mockCollectionRepository.create).not.toHaveBeenCalled();
            expect(mockCollectionRepository.save).not.toHaveBeenCalled();
        });
    });

    describe('getUserCollection', () => {
        const userId = 'user-123';

        it('should return user collection with card details', async () => {
            const mockUser = { id: userId, nickname: 'TestUser' };
            const mockCollectionCards = [
                { id: 1, userId, cardId: 1 },
                { id: 2, userId, cardId: 2 },
            ];
            const mockAllCards = [
                { id: 1, innerCardId: 'arcane_shield', isForSale: true, price: 100 },
                { id: 2, innerCardId: 'moon_staff', isForSale: true, price: 150 },
                { id: 3, innerCardId: 'axe_of_the_berserker', isForSale: false, price: 200 },
            ];

            mockUsersService.findOne.mockResolvedValue(mockUser as any);
            mockCollectionRepository.find.mockResolvedValue(mockCollectionCards as any);
            mockCardRepository.find.mockResolvedValue(mockAllCards as any);

            const result = await service.getUserCollection(userId);

            expect(usersService.findOne).toHaveBeenCalledWith(userId);
            expect(collectionRepository.find).toHaveBeenCalledWith({ where: { userId } });
            expect(cardRepository.find).toHaveBeenCalled();
            expect(result.cards).toHaveLength(2);
            expect(result.cards[0].hasCard).toBe(true);
        });

        it('should throw UserNotFoundException if user not found', async () => {
            mockUsersService.findOne.mockRejectedValue(new UserNotFoundException());

            await expect(service.getUserCollection(userId)).rejects.toThrow(UserNotFoundException);
        });
    });

    describe('buyCard', () => {
        const userId = 'user-123';
        const cardId = 1;
        const cardPrice = 100;
        const userGold = 500;

        it('should successfully buy a card', async () => {
            const queryRunner = dataSource.createQueryRunner();
            const mockUser = { id: userId, gold: userGold };
            const mockCard = { id: cardId, price: cardPrice, isForSale: true };
            const mockNewCollectionRow = { userId, cardId };

            const mockQueryBuilder = {
                setLock: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn(),
            };

            (queryRunner.manager.createQueryBuilder as jest.Mock)
                .mockReturnValueOnce(mockQueryBuilder)
                .mockReturnValueOnce(mockQueryBuilder);
            mockQueryBuilder.getOne.mockResolvedValueOnce(mockUser).mockResolvedValueOnce(mockCard);
            
            (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(null);
            (queryRunner.manager.create as jest.Mock).mockReturnValue(mockNewCollectionRow);
            (queryRunner.manager.save as jest.Mock).mockResolvedValue({});

            await service.buyCard(userId, cardId);

            expect(queryRunner.connect).toHaveBeenCalled();
            expect(queryRunner.startTransaction).toHaveBeenCalled();
            expect(queryRunner.commitTransaction).toHaveBeenCalled();
            expect(queryRunner.release).toHaveBeenCalled();
        });

        it('should throw UserNotFoundException if user not found', async () => {
            const queryRunner = dataSource.createQueryRunner();
            
            const mockQueryBuilder = {
                setLock: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(null),
            };

            (queryRunner.manager.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

            await expect(service.buyCard(userId, cardId)).rejects.toThrow(UserNotFoundException);
            expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
        });

        it('should throw CardNotFoundException if card not found', async () => {
            const queryRunner = dataSource.createQueryRunner();
            const mockUser = { id: userId, gold: userGold };
            
            const mockQueryBuilder = {
                setLock: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn(),
            };

            (queryRunner.manager.createQueryBuilder as jest.Mock)
                .mockReturnValueOnce(mockQueryBuilder)
                .mockReturnValueOnce(mockQueryBuilder);
            mockQueryBuilder.getOne
                .mockResolvedValueOnce(mockUser)
                .mockResolvedValueOnce(null);

            await expect(service.buyCard(userId, cardId)).rejects.toThrow(CardNotFoundException);
            expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
        });

        it('should throw CardAlreadyExistException if card already in collection', async () => {
            const queryRunner = dataSource.createQueryRunner();
            const mockUser = { id: userId, gold: userGold };
            const mockCard = { id: cardId, price: cardPrice, isForSale: true };
            const existingCollection = { id: 1, userId, cardId };

            const mockQueryBuilder = {
                setLock: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn(),
            };

            (queryRunner.manager.createQueryBuilder as jest.Mock)
                .mockReturnValueOnce(mockQueryBuilder)
                .mockReturnValueOnce(mockQueryBuilder);
            mockQueryBuilder.getOne
                .mockResolvedValueOnce(mockUser)
                .mockResolvedValueOnce(mockCard);
            
            (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(existingCollection);

            await expect(service.buyCard(userId, cardId)).rejects.toThrow(CardAlreadyExistException);
            expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
        });

        it('should throw NotEnoughGoldException if user has insufficient gold', async () => {
            const queryRunner = dataSource.createQueryRunner();
            const mockUser = { id: userId, gold: 50 };
            const mockCard = { id: cardId, price: 100, isForSale: true };

            const mockQueryBuilder = {
                setLock: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn(),
            };

            (queryRunner.manager.createQueryBuilder as jest.Mock)
                .mockReturnValueOnce(mockQueryBuilder)
                .mockReturnValueOnce(mockQueryBuilder);
            mockQueryBuilder.getOne
                .mockResolvedValueOnce(mockUser)
                .mockResolvedValueOnce(mockCard);
            
            (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(null);

            await expect(service.buyCard(userId, cardId)).rejects.toThrow(NotEnoughGoldException);
            expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
        });

        it('should throw CardNotForSaleException if card is not for sale', async () => {
            const queryRunner = dataSource.createQueryRunner();
            const mockUser = { id: userId, gold: userGold };
            const mockCard = { id: cardId, price: cardPrice, isForSale: false };

            const mockQueryBuilder = {
                setLock: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn(),
            };

            (queryRunner.manager.createQueryBuilder as jest.Mock)
                .mockReturnValueOnce(mockQueryBuilder)
                .mockReturnValueOnce(mockQueryBuilder);
            mockQueryBuilder.getOne
                .mockResolvedValueOnce(mockUser)
                .mockResolvedValueOnce(mockCard);
            
            (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(null);

            await expect(service.buyCard(userId, cardId)).rejects.toThrow(CardNotForSaleException);
            expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
        });
    });

    describe('giveGold', () => {
        const userId = 'user-123';
        const amount = 100;

        it('should successfully add gold to user', async () => {
            const queryRunner = dataSource.createQueryRunner();
            const mockUser = { id: userId, gold: 500 };

            const mockQueryBuilder = {
                setLock: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockUser),
            };

            (queryRunner.manager.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);
            (queryRunner.manager.save as jest.Mock).mockResolvedValue({});

            await service.giveGold(userId, amount);

            expect(queryRunner.connect).toHaveBeenCalled();
            expect(queryRunner.startTransaction).toHaveBeenCalled();
            expect(queryRunner.manager.save).toHaveBeenCalled();
            expect(queryRunner.commitTransaction).toHaveBeenCalled();
            expect(queryRunner.release).toHaveBeenCalled();
        });

        it('should throw UserNotFoundException if user not found', async () => {
            const queryRunner = dataSource.createQueryRunner();
            
            const mockQueryBuilder = {
                setLock: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(null),
            };

            (queryRunner.manager.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

            await expect(service.giveGold(userId, amount)).rejects.toThrow(UserNotFoundException);
            expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
        });
    });
});