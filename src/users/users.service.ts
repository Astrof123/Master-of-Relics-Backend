import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Not, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import {
    FriendshipNotFoundException,
    InvalidFriendException,
    UserNotFoundException,
    UserStatsNotFoundException,
} from './exceptions/users.exception';
import { UserProfileResponseDto } from './dto/user-profile-response.dto';
import { UserStats } from './entities/user-stats.entity';
import { Friend, OfferFriendship, RELATIONSHIP } from './types/friend';
import { FriendRelationShip } from './entities/friend-relationship.entity';
import { FindFriendsDto } from './dto/find-friends.dto';
import { SocketConnectionService } from 'src/socket-connection/socket-connection.service';
import { ReportUserDto } from './dto/report-user.dto';
import { Report } from './entities/report.entity';
import { GetReportsDto } from './dto/get-reports.dto';
import { BanUserDto } from './dto/ban-user.dto';
import { UnbanUserDto } from './dto/unban-user.dto';
import { SetAdminDto } from './dto/set-admin.dto';
import { GetUsersDto } from './dto/users.dto';
import { validate as isValidUUID } from 'uuid';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(UserStats)
        private userStatsRepository: Repository<UserStats>,
        @InjectRepository(FriendRelationShip)
        private friendRelationShipRepository: Repository<FriendRelationShip>,
        @InjectRepository(Report)
        private reportRepository: Repository<Report>,
        private socketConnectionService: SocketConnectionService,
    ) {}

    async findFriends(
        findFriendsDto: FindFriendsDto,
        currentUserId: string,
    ): Promise<User[]> {
        const users = await this.userRepository.find({
            where: {
                id: Not(currentUserId),
                friendCode: findFriendsDto.searchQuery,
            },
            take: 12,
        });

        const filteredUsers: User[] = [];

        for (const user of users) {
            const friendship = await this.friendRelationShipRepository.findOne({
                where: [
                    { requesterId: currentUserId, addresseeId: user.id },
                    { requesterId: user.id, addresseeId: currentUserId },
                ],
            });

            if (!friendship) {
                filteredUsers.push(user);
            }
        }

        return filteredUsers;
    }

    async findOne(id: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id },
        });

        if (!user) {
            throw new UserNotFoundException();
        }

        if (user.bannedUntil) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (user.bannedUntil < today) {
                user.banReason = null;
                user.bannedUntil = null;
                await this.userRepository.save(user);
            }
        }

        return user;
    }

    async getFriends(userId: string): Promise<Friend[]> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });

        if (!user) {
            throw new UserNotFoundException();
        }

        const friendships = await this.friendRelationShipRepository.find({
            where: [
                { requesterId: user.id, status: RELATIONSHIP.FRIEND },
                { addresseeId: user.id, status: RELATIONSHIP.FRIEND },
            ],
            relations: {
                addressee: true,
                requester: true,
            },
        });

        const friendshipsDto: Friend[] = [];

        const onlinePlayers =
            await this.socketConnectionService.getOnlinePlayers();
        for (const friend of friendships) {
            const friendId =
                friend.addressee.id === user.id
                    ? friend.requesterId
                    : friend.addresseeId;

            friendshipsDto.push({
                id: friend.id,
                nickname:
                    friend.addressee.id === user.id
                        ? friend.requester.nickname
                        : friend.addressee.nickname,
                friendId: friendId,
                isOnline: onlinePlayers.includes(friendId.toString()),
            });
        }

        return friendshipsDto;
    }

    async profile(id: string, userId: string): Promise<UserProfileResponseDto> {
        if (!isValidUUID(id)) {
            throw new UserNotFoundException();
        }

        const user = await this.userRepository.findOne({
            where: { id },
        });

        if (!user) {
            throw new UserNotFoundException();
        }

        const userStats = await this.userStatsRepository.findOne({
            where: { userId: user.id },
        });

        if (!userStats) {
            throw new UserStatsNotFoundException();
        }

        const currentUser = await this.userRepository.findOne({
            where: { id: userId },
        });

        if (!currentUser) {
            throw new UserNotFoundException();
        }

        const friendshipsDto = await this.getFriends(user.id);

        const myFriendship = await this.friendRelationShipRepository.findOne({
            where: [
                { requesterId: user.id, addresseeId: currentUser.id },
                { requesterId: currentUser.id, addresseeId: user.id },
            ],
        });

        let offerFriendshipsDto: OfferFriendship[] | null = null;
        if (id == userId) {
            const offers = await this.friendRelationShipRepository.find({
                where: {
                    addresseeId: currentUser.id,
                    status: RELATIONSHIP.OFFER,
                },
                relations: {
                    requester: true,
                },
            });

            offerFriendshipsDto = offers.map((offer) => {
                return {
                    id: offer.id,
                    nickname: offer.requester.nickname,
                    requesterId: offer.requester.id,
                };
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const reportByUser = await this.reportRepository.findOne({
            where: {
                requesterUserId: currentUser.id,
                reportedUserId: user.id,
                createdAt: Between(today, tomorrow),
            },
        });

        const onlinePlayers =
            await this.socketConnectionService.getOnlinePlayers();
        const response: UserProfileResponseDto = {
            id: user.id,
            nickname: user.nickname,
            isOnline: onlinePlayers.includes(user.id.toString()),
            friends: friendshipsDto,
            isReported: reportByUser ? true : false,
            relationship: myFriendship
                ? myFriendship.status
                : RELATIONSHIP.STRANGER,
            relationshipInitiator: myFriendship
                ? myFriendship?.requesterId
                : null,
            stats: {
                wins: userStats.wins,
                winSeries: userStats.winSeries,
                totalGames: userStats.totalGames,
            },
            offersFriendship: offerFriendshipsDto,
            isBanned: user.bannedUntil ? true : false,
        };

        return response;
    }

    async offerFriendship(friendId: string, currentUserId: string) {
        const user = await this.userRepository.findOne({
            where: { id: friendId },
        });

        if (!user) {
            throw new UserNotFoundException();
        }

        if (user.id === currentUserId) {
            throw new InvalidFriendException();
        }

        const currentUser = await this.userRepository.findOne({
            where: { id: currentUserId },
        });

        if (!currentUser) {
            throw new UserNotFoundException();
        }

        const newRelation = this.friendRelationShipRepository.create({
            addresseeId: user.id,
            requesterId: currentUser.id,
            status: RELATIONSHIP.OFFER,
        });
        await this.friendRelationShipRepository.save(newRelation);
    }

    async acceptFriendship(friendId: string, currentUserId: string) {
        if (friendId === currentUserId) {
            throw new InvalidFriendException();
        }

        const friendship = await this.friendRelationShipRepository.findOne({
            where: [
                { requesterId: currentUserId, addresseeId: friendId },
                { requesterId: friendId, addresseeId: currentUserId },
            ],
        });

        if (!friendship) {
            throw new FriendshipNotFoundException();
        }

        friendship.status = RELATIONSHIP.FRIEND;
        await this.friendRelationShipRepository.save(friendship);
    }

    async breakoffFriendship(friendId: string, currentUserId: string) {
        if (friendId === currentUserId) {
            throw new InvalidFriendException();
        }

        const friendship = await this.friendRelationShipRepository.findOne({
            where: [
                { requesterId: currentUserId, addresseeId: friendId },
                { requesterId: friendId, addresseeId: currentUserId },
            ],
        });

        if (!friendship) {
            throw new FriendshipNotFoundException();
        }

        await this.friendRelationShipRepository.softDelete(friendship.id);
    }

    async reportUser(data: ReportUserDto, currentUserId: string) {
        const user = await this.userRepository.findOne({
            where: { id: data.reportedUserId },
        });

        if (!user) {
            throw new UserNotFoundException();
        }

        const newReport = this.reportRepository.create({
            reportedUserId: user.id,
            requesterUserId: currentUserId,
            text: data.text,
            reportType: data.reportType,
        });

        await this.reportRepository.save(newReport);
    }

    async banUser(data: BanUserDto) {
        const user = await this.userRepository.findOne({
            where: { id: data.bannedUserId },
        });

        if (!user) {
            throw new UserNotFoundException();
        }

        const bannedUntilDate = new Date(data.bannedUntil);
        user.banReason = data.text;
        user.bannedUntil = bannedUntilDate;
        await this.userRepository.save(user);

        const reports = await this.reportRepository.find({
            where: { reportedUserId: user.id, isProcessed: false },
        });

        for (const report of reports) {
            report.isProcessed = true;
            await this.reportRepository.save(report);
        }
    }

    async unbanUser(data: UnbanUserDto) {
        const user = await this.userRepository.findOne({
            where: { id: data.bannedUserId },
        });

        if (!user) {
            throw new UserNotFoundException();
        }

        user.banReason = null;
        user.bannedUntil = null;
        await this.userRepository.save(user);
    }

    async getReports(data: GetReportsDto) {
        const page = Number(data.page) || 1;
        const limit = Number(data.limit) || 10;
        const reportedUserId = data.reportedUserId;
        const startDate = data.startDate;
        const endDate = data.endDate;
        const isProcessed = data.isProcessed;

        const skip = (page - 1) * limit;

        const queryBuilder = this.reportRepository
            .createQueryBuilder('report')
            .leftJoinAndSelect('report.requesterUser', 'requesterUser')
            .leftJoinAndSelect('report.reportedUser', 'reportedUser');

        if (reportedUserId) {
            queryBuilder.andWhere('reportedUser.id = :reportedUserId', {
                reportedUserId: reportedUserId,
            });
        }

        if (isProcessed !== undefined && isProcessed !== null) {
            queryBuilder.andWhere('report.isProcessed = :isProcessed', {
                isProcessed: isProcessed,
            });
        }

        if (startDate) {
            const startDateTime = new Date(startDate);
            startDateTime.setHours(0, 0, 0, 0);
            queryBuilder.andWhere('report.createdAt >= :startDate', {
                startDate: startDateTime,
            });
        }

        if (endDate) {
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);
            queryBuilder.andWhere('report.createdAt <= :endDate', {
                endDate: endDateTime,
            });
        }

        queryBuilder.orderBy(`report.createdAt`, 'DESC');

        queryBuilder.skip(skip).take(limit);

        const [reports, total] = await queryBuilder.getManyAndCount();

        return {
            data: reports,
            total: total,
            page: page,
            limit: limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getAllUsers(data: GetUsersDto) {
        const page = Number(data.page) || 1;
        const limit = Number(data.limit) || 10;
        const userId = data.userId;

        const skip = (page - 1) * limit;

        const queryBuilder = this.userRepository.createQueryBuilder('user');

        if (userId) {
            queryBuilder.andWhere('CAST(user.id AS TEXT) LIKE :userId', {
                userId: `%${userId}%`,
            });
        }

        if (data.isBanned !== undefined && data.isBanned !== null) {
            if (data.isBanned) {
                queryBuilder.andWhere('user.bannedUntil IS NOT NULL');
            } else {
                queryBuilder.andWhere('user.bannedUntil IS NULL');
            }
        }

        if (data.isAdmin !== undefined && data.isAdmin !== null) {
            queryBuilder.andWhere('user.isAdmin = :isAdmin', {
                isAdmin: data.isAdmin,
            });
        }

        queryBuilder.orderBy(`user.createdAt`, 'DESC');
        queryBuilder.skip(skip).take(limit);

        const [users, total] = await queryBuilder.getManyAndCount();

        return {
            data: users,
            total: total,
            page: page,
            limit: limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async setAdmin(setAdminDto: SetAdminDto) {
        const user = await this.userRepository.findOne({
            where: { id: setAdminDto.userId },
        });

        if (!user) {
            throw new UserNotFoundException();
        }

        user.isAdmin = setAdminDto.isAdmin;
        await this.userRepository.save(user);
    }
}
