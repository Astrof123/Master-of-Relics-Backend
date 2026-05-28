import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { InviteCodeService } from './invite-code.service';
import { InviteCode } from './entities/invite-code.entity';
import { GetInviteCodesDto } from './dtos/get-invite-codes.dto';
import { CreateInviteCodesDto } from './dtos/create-invite-codes.dto';
import { ChangeStatusDto } from './dtos/change-status.dto';
import { InviteCodeNotFoundException } from './exceptions/invite-code.exception';
import { INVITE_CODE_STATUS } from './types/invite-code';

const createMockInviteCode = (
    id: string,
    status: string = INVITE_CODE_STATUS.FREE,
    userId?: string,
): InviteCode => {
    const inviteCode = new InviteCode();
    inviteCode.id = id;
    inviteCode.status = status as any;
    inviteCode.userId = userId;
    inviteCode.user = undefined;
    inviteCode.usedAt = userId ? new Date() : undefined;
    inviteCode.createdAt = new Date();
    inviteCode.deletedAt = undefined;
    return inviteCode;
};

const createMockQueryBuilder = () => {
    const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(),
    } as unknown as jest.Mocked<SelectQueryBuilder<InviteCode>>;
    return mockQueryBuilder;
};

describe('InviteCodeService', () => {
    let service: InviteCodeService;
    let inviteCodeRepository: jest.Mocked<Repository<InviteCode>>;

    const mockInviteCodeRepository = {
        createQueryBuilder: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
        softDelete: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InviteCodeService,
                {
                    provide: getRepositoryToken(InviteCode),
                    useValue: mockInviteCodeRepository,
                },
            ],
        }).compile();

        service = module.get<InviteCodeService>(InviteCodeService);
        inviteCodeRepository = module.get(getRepositoryToken(InviteCode));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getInviteCodes', () => {
        const defaultGetInviteCodesDto: GetInviteCodesDto = {
            page: 1,
            limit: 10,
        };

        it('should return paginated invite codes without filters', async () => {
            const mockInviteCodes = [
                createMockInviteCode('code-1', INVITE_CODE_STATUS.FREE),
                createMockInviteCode(
                    'code-2',
                    INVITE_CODE_STATUS.USED,
                    'user-1',
                ),
            ];
            const total = 2;
            const mockQueryBuilder = createMockQueryBuilder();
            mockQueryBuilder.getManyAndCount.mockResolvedValue([
                mockInviteCodes,
                total,
            ]);

            mockInviteCodeRepository.createQueryBuilder.mockReturnValue(
                mockQueryBuilder,
            );

            const result = await service.getInviteCodes(
                defaultGetInviteCodesDto,
            );

            expect(
                mockInviteCodeRepository.createQueryBuilder,
            ).toHaveBeenCalledWith('inviteCode');
            expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
                'inviteCode.user',
                'user',
            );
            expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
                'inviteCode.createdAt',
                'DESC',
            );
            expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
            expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
            expect(result).toEqual({
                data: mockInviteCodes,
                total: 2,
                page: 1,
                limit: 10,
                totalPages: 1,
            });
        });

        it('should filter by inviteCodeId', async () => {
            const getInviteCodesDto: GetInviteCodesDto = {
                ...defaultGetInviteCodesDto,
                inviteCodeId: 'test-id',
            };
            const mockInviteCodes = [
                createMockInviteCode('test-id-123', INVITE_CODE_STATUS.FREE),
            ];
            const mockQueryBuilder = createMockQueryBuilder();
            mockQueryBuilder.getManyAndCount.mockResolvedValue([
                mockInviteCodes,
                1,
            ]);

            mockInviteCodeRepository.createQueryBuilder.mockReturnValue(
                mockQueryBuilder,
            );

            const result = await service.getInviteCodes(getInviteCodesDto);

            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
                'CAST(inviteCode.id AS TEXT) LIKE :inviteCodeId',
                { inviteCodeId: '%test-id%' },
            );
            expect(result.data).toHaveLength(1);
        });

        it('should filter by status', async () => {
            const getInviteCodesDto: GetInviteCodesDto = {
                ...defaultGetInviteCodesDto,
                status: INVITE_CODE_STATUS.USED,
            };
            const mockInviteCodes = [
                createMockInviteCode(
                    'code-1',
                    INVITE_CODE_STATUS.USED,
                    'user-1',
                ),
            ];
            const mockQueryBuilder = createMockQueryBuilder();
            mockQueryBuilder.getManyAndCount.mockResolvedValue([
                mockInviteCodes,
                1,
            ]);

            mockInviteCodeRepository.createQueryBuilder.mockReturnValue(
                mockQueryBuilder,
            );

            const result = await service.getInviteCodes(getInviteCodesDto);

            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
                'inviteCode.status = :status',
                { status: INVITE_CODE_STATUS.USED },
            );
            expect(result.data).toHaveLength(1);
        });

        it('should filter by startDate', async () => {
            const startDate = '2024-01-01';
            const getInviteCodesDto: GetInviteCodesDto = {
                ...defaultGetInviteCodesDto,
                startDate,
            };
            const mockInviteCodes = [
                createMockInviteCode('code-1', INVITE_CODE_STATUS.FREE),
            ];
            const mockQueryBuilder = createMockQueryBuilder();
            mockQueryBuilder.getManyAndCount.mockResolvedValue([
                mockInviteCodes,
                1,
            ]);

            mockInviteCodeRepository.createQueryBuilder.mockReturnValue(
                mockQueryBuilder,
            );

            await service.getInviteCodes(getInviteCodesDto);

            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
                'inviteCode.createdAt >= :startDate',
                expect.objectContaining({ startDate: expect.any(Date) }),
            );
        });

        it('should filter by endDate', async () => {
            const endDate = '2024-12-31';
            const getInviteCodesDto: GetInviteCodesDto = {
                ...defaultGetInviteCodesDto,
                endDate,
            };
            const mockInviteCodes = [
                createMockInviteCode('code-1', INVITE_CODE_STATUS.FREE),
            ];
            const mockQueryBuilder = createMockQueryBuilder();
            mockQueryBuilder.getManyAndCount.mockResolvedValue([
                mockInviteCodes,
                1,
            ]);

            mockInviteCodeRepository.createQueryBuilder.mockReturnValue(
                mockQueryBuilder,
            );

            await service.getInviteCodes(getInviteCodesDto);

            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
                'inviteCode.createdAt <= :endDate',
                expect.objectContaining({ endDate: expect.any(Date) }),
            );
        });

        it('should filter by both startDate and endDate', async () => {
            const getInviteCodesDto: GetInviteCodesDto = {
                ...defaultGetInviteCodesDto,
                startDate: '2024-01-01',
                endDate: '2024-12-31',
            };
            const mockInviteCodes = [
                createMockInviteCode('code-1', INVITE_CODE_STATUS.FREE),
            ];
            const mockQueryBuilder = createMockQueryBuilder();
            mockQueryBuilder.getManyAndCount.mockResolvedValue([
                mockInviteCodes,
                1,
            ]);

            mockInviteCodeRepository.createQueryBuilder.mockReturnValue(
                mockQueryBuilder,
            );

            await service.getInviteCodes(getInviteCodesDto);

            expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(2);
        });

        it('should apply multiple filters simultaneously', async () => {
            const getInviteCodesDto: GetInviteCodesDto = {
                page: 2,
                limit: 5,
                inviteCodeId: 'test',
                status: INVITE_CODE_STATUS.FREE,
                startDate: '2024-01-01',
                endDate: '2024-12-31',
            };
            const mockInviteCodes = [
                createMockInviteCode('test-123', INVITE_CODE_STATUS.FREE),
            ];
            const mockQueryBuilder = createMockQueryBuilder();
            mockQueryBuilder.getManyAndCount.mockResolvedValue([
                mockInviteCodes,
                1,
            ]);

            mockInviteCodeRepository.createQueryBuilder.mockReturnValue(
                mockQueryBuilder,
            );

            const result = await service.getInviteCodes(getInviteCodesDto);

            expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(4);
            expect(mockQueryBuilder.skip).toHaveBeenCalledWith(5);
            expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
            expect(result.page).toBe(2);
            expect(result.limit).toBe(5);
        });

        it('should use default values when page and limit are not provided', async () => {
            const getInviteCodesDto: GetInviteCodesDto = {};
            const mockInviteCodes: InviteCode[] = [];
            const mockQueryBuilder = createMockQueryBuilder();
            mockQueryBuilder.getManyAndCount.mockResolvedValue([
                mockInviteCodes,
                0,
            ]);

            mockInviteCodeRepository.createQueryBuilder.mockReturnValue(
                mockQueryBuilder,
            );

            const result = await service.getInviteCodes(getInviteCodesDto);

            expect(result.page).toBe(1);
            expect(result.limit).toBe(10);
            expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
            expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
        });

        it('should calculate totalPages correctly', async () => {
            const getInviteCodesDto: GetInviteCodesDto = { page: 1, limit: 5 };
            const mockInviteCodes = Array(5)
                .fill(null)
                .map((_, i) =>
                    createMockInviteCode(`code-${i}`, INVITE_CODE_STATUS.FREE),
                );
            const total = 12;
            const mockQueryBuilder = createMockQueryBuilder();
            mockQueryBuilder.getManyAndCount.mockResolvedValue([
                mockInviteCodes,
                total,
            ]);

            mockInviteCodeRepository.createQueryBuilder.mockReturnValue(
                mockQueryBuilder,
            );

            const result = await service.getInviteCodes(getInviteCodesDto);

            expect(result.totalPages).toBe(Math.ceil(total / 5));
        });
    });

    describe('createInviteCodes', () => {
        const createDto: CreateInviteCodesDto = { count: 3 };

        it('should create multiple invite codes', async () => {
            const mockInviteCodes = [
                createMockInviteCode('code-1', INVITE_CODE_STATUS.FREE),
                createMockInviteCode('code-2', INVITE_CODE_STATUS.FREE),
                createMockInviteCode('code-3', INVITE_CODE_STATUS.FREE),
            ];

            mockInviteCodeRepository.create.mockImplementation((data) => {
                const code = new InviteCode();
                code.id = `code-${Math.random()}`;
                code.status = data.status;
                return code;
            });
            mockInviteCodeRepository.save.mockImplementation((code) =>
                Promise.resolve(code),
            );

            const result = await service.createInviteCodes(createDto);

            expect(mockInviteCodeRepository.create).toHaveBeenCalledTimes(3);
            expect(mockInviteCodeRepository.create).toHaveBeenCalledWith({
                status: INVITE_CODE_STATUS.FREE,
            });
            expect(mockInviteCodeRepository.save).toHaveBeenCalledTimes(3);
            expect(result).toHaveLength(3);
        });

        it('should create single invite code when count is 1', async () => {
            const createDto: CreateInviteCodesDto = { count: 1 };
            const mockInviteCode = createMockInviteCode(
                'single-code',
                INVITE_CODE_STATUS.FREE,
            );

            mockInviteCodeRepository.create.mockReturnValue(mockInviteCode);
            mockInviteCodeRepository.save.mockResolvedValue(mockInviteCode);

            const result = await service.createInviteCodes(createDto);

            expect(mockInviteCodeRepository.create).toHaveBeenCalledTimes(1);
            expect(mockInviteCodeRepository.save).toHaveBeenCalledTimes(1);
            expect(result).toHaveLength(1);
        });

        it('should create 10 invite codes (maximum)', async () => {
            const createDto: CreateInviteCodesDto = { count: 10 };
            const mockInviteCodes = Array(10)
                .fill(null)
                .map(() =>
                    createMockInviteCode(
                        `code-${Math.random()}`,
                        INVITE_CODE_STATUS.FREE,
                    ),
                );

            mockInviteCodeRepository.create.mockImplementation((data) => {
                const code = new InviteCode();
                code.id = `code-${Math.random()}`;
                code.status = data.status;
                return code;
            });
            mockInviteCodeRepository.save.mockImplementation((code) =>
                Promise.resolve(code),
            );

            const result = await service.createInviteCodes(createDto);

            expect(mockInviteCodeRepository.create).toHaveBeenCalledTimes(10);
            expect(mockInviteCodeRepository.save).toHaveBeenCalledTimes(10);
            expect(result).toHaveLength(10);
        });
    });

    describe('changeStatus', () => {
        const changeStatusDto: ChangeStatusDto = {
            inviteCodeId: 'code-123',
            newStatus: INVITE_CODE_STATUS.BOOKED,
        };

        it('should change invite code status successfully', async () => {
            const existingInviteCode = createMockInviteCode(
                'code-123',
                INVITE_CODE_STATUS.FREE,
            );

            mockInviteCodeRepository.findOne.mockResolvedValue(
                existingInviteCode,
            );
            mockInviteCodeRepository.save.mockResolvedValue(existingInviteCode);

            await service.changeStatus(changeStatusDto);

            expect(mockInviteCodeRepository.findOne).toHaveBeenCalledWith({
                where: { id: changeStatusDto.inviteCodeId },
            });
            expect(existingInviteCode.status).toBe(INVITE_CODE_STATUS.BOOKED);
            expect(mockInviteCodeRepository.save).toHaveBeenCalledWith(
                existingInviteCode,
            );
        });

        it('should change status from FREE to USED', async () => {
            const changeStatusDto: ChangeStatusDto = {
                inviteCodeId: 'code-123',
                newStatus: INVITE_CODE_STATUS.USED,
            };
            const existingInviteCode = createMockInviteCode(
                'code-123',
                INVITE_CODE_STATUS.FREE,
            );

            mockInviteCodeRepository.findOne.mockResolvedValue(
                existingInviteCode,
            );
            mockInviteCodeRepository.save.mockResolvedValue(existingInviteCode);

            await service.changeStatus(changeStatusDto);

            expect(existingInviteCode.status).toBe(INVITE_CODE_STATUS.USED);
        });

        it('should change status from BOOKED to FREE', async () => {
            const changeStatusDto: ChangeStatusDto = {
                inviteCodeId: 'code-123',
                newStatus: INVITE_CODE_STATUS.FREE,
            };
            const existingInviteCode = createMockInviteCode(
                'code-123',
                INVITE_CODE_STATUS.BOOKED,
            );

            mockInviteCodeRepository.findOne.mockResolvedValue(
                existingInviteCode,
            );
            mockInviteCodeRepository.save.mockResolvedValue(existingInviteCode);

            await service.changeStatus(changeStatusDto);

            expect(existingInviteCode.status).toBe(INVITE_CODE_STATUS.FREE);
        });

        it('should throw InviteCodeNotFoundException if invite code not found', async () => {
            mockInviteCodeRepository.findOne.mockResolvedValue(null);

            await expect(service.changeStatus(changeStatusDto)).rejects.toThrow(
                InviteCodeNotFoundException,
            );
            expect(mockInviteCodeRepository.save).not.toHaveBeenCalled();
        });
    });

    describe('deleteInviteCode', () => {
        const inviteCodeId = 'code-123';

        it('should soft delete invite code successfully', async () => {
            const existingInviteCode = createMockInviteCode(
                inviteCodeId,
                INVITE_CODE_STATUS.FREE,
            );

            mockInviteCodeRepository.findOne.mockResolvedValue(
                existingInviteCode,
            );
            mockInviteCodeRepository.softDelete.mockResolvedValue({
                affected: 1,
            } as any);

            await service.deleteInviteCode(inviteCodeId);

            expect(mockInviteCodeRepository.findOne).toHaveBeenCalledWith({
                where: { id: inviteCodeId },
            });
            expect(mockInviteCodeRepository.softDelete).toHaveBeenCalledWith(
                existingInviteCode.id,
            );
        });

        it('should soft delete used invite code', async () => {
            const existingInviteCode = createMockInviteCode(
                inviteCodeId,
                INVITE_CODE_STATUS.USED,
                'user-1',
            );

            mockInviteCodeRepository.findOne.mockResolvedValue(
                existingInviteCode,
            );
            mockInviteCodeRepository.softDelete.mockResolvedValue({
                affected: 1,
            } as any);

            await service.deleteInviteCode(inviteCodeId);

            expect(mockInviteCodeRepository.softDelete).toHaveBeenCalledWith(
                existingInviteCode.id,
            );
        });

        it('should throw InviteCodeNotFoundException if invite code not found', async () => {
            mockInviteCodeRepository.findOne.mockResolvedValue(null);

            await expect(
                service.deleteInviteCode(inviteCodeId),
            ).rejects.toThrow(InviteCodeNotFoundException);
            expect(mockInviteCodeRepository.softDelete).not.toHaveBeenCalled();
        });
    });

    describe('Edge cases and error handling', () => {
        it('should handle empty result set in getInviteCodes', async () => {
            const getInviteCodesDto: GetInviteCodesDto = { page: 1, limit: 10 };
            const mockQueryBuilder = createMockQueryBuilder();
            mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

            mockInviteCodeRepository.createQueryBuilder.mockReturnValue(
                mockQueryBuilder,
            );

            const result = await service.getInviteCodes(getInviteCodesDto);

            expect(result.data).toEqual([]);
            expect(result.total).toBe(0);
            expect(result.totalPages).toBe(0);
        });

        it('should handle invalid page and limit values', async () => {
            const getInviteCodesDto: GetInviteCodesDto = {
                page: NaN,
                limit: NaN,
            };
            const mockQueryBuilder = createMockQueryBuilder();
            mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

            mockInviteCodeRepository.createQueryBuilder.mockReturnValue(
                mockQueryBuilder,
            );

            const result = await service.getInviteCodes(getInviteCodesDto);

            expect(result.page).toBe(1);
            expect(result.limit).toBe(10);
        });

        it('should handle repository error in createInviteCodes', async () => {
            const createDto: CreateInviteCodesDto = { count: 1 };
            const dbError = new Error('Database error');

            mockInviteCodeRepository.create.mockReturnValue(
                createMockInviteCode('code-1', INVITE_CODE_STATUS.FREE),
            );
            mockInviteCodeRepository.save.mockRejectedValue(dbError);

            await expect(service.createInviteCodes(createDto)).rejects.toThrow(
                dbError,
            );
        });

        it('should handle repository error in changeStatus', async () => {
            const changeStatusDto: ChangeStatusDto = {
                inviteCodeId: 'code-123',
                newStatus: INVITE_CODE_STATUS.BOOKED,
            };
            const existingInviteCode = createMockInviteCode(
                'code-123',
                INVITE_CODE_STATUS.FREE,
            );
            const dbError = new Error('Database error');

            mockInviteCodeRepository.findOne.mockResolvedValue(
                existingInviteCode,
            );
            mockInviteCodeRepository.save.mockRejectedValue(dbError);

            await expect(service.changeStatus(changeStatusDto)).rejects.toThrow(
                dbError,
            );
        });

        it('should handle repository error in deleteInviteCode', async () => {
            const inviteCodeId = 'code-123';
            const existingInviteCode = createMockInviteCode(
                inviteCodeId,
                INVITE_CODE_STATUS.FREE,
            );
            const dbError = new Error('Database error');

            mockInviteCodeRepository.findOne.mockResolvedValue(
                existingInviteCode,
            );
            mockInviteCodeRepository.softDelete.mockRejectedValue(dbError);

            await expect(
                service.deleteInviteCode(inviteCodeId),
            ).rejects.toThrow(dbError);
        });
    });
});
