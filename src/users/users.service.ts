import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Not, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { FriendshipNotFoundException, InvalidFriendException, UserNotFoundException, UserStatsNotFoundException } from './exceptions/users.exception';
import { UserProfileResponseDto } from './dto/user-profile-response.dto';
import { UserStats } from './entities/user-stats.entity';
import { Friend, OfferFriendship, RELATIONSHIP } from './types/friend';
import { FriendRelationShip } from './entities/friend-relationship.entity';
import { FindFriendsDto } from './dto/find-friends.dto';
import { SocketConnectionService } from 'src/socket-connection/socket-connection.service';


@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectRepository(UserStats)
        private userStatsRepository: Repository<UserStats>,
        @InjectRepository(FriendRelationShip)
        private friendRelationShipRepository: Repository<FriendRelationShip>,
        private socketConnectionService: SocketConnectionService
    ) {}

    async findFriends(findFriendsDto: FindFriendsDto, currentUserId: number): Promise<User[]> {
        const users = await this.usersRepository.find({
            where: { id: Not(currentUserId), nickname: Like(`%${findFriendsDto.searchQuery}%`) },
            take: 12
        });

        const filteredUsers: User[] = [];

        for (const user of users) {
            const friendship = await this.friendRelationShipRepository.findOne({
                where: [
                    { requesterId: currentUserId, addresseeId: user.id },
                    { requesterId: user.id, addresseeId: currentUserId }
                ]
            });

            if (!friendship) {
                filteredUsers.push(user);
            }
        }

        return filteredUsers;
    }

    async findOne(id: number): Promise<User> {
        const user = await this.usersRepository.findOne({
            where: { id }
        });

        if (!user) {
            throw new UserNotFoundException();
        }

        return user;
    }

    async getFriends(userId: number): Promise<Friend[]> {
        const user = await this.usersRepository.findOne({
            where: { id: userId }
        });

        if (!user) {
            throw new UserNotFoundException();
        }

        const friendships = await this.friendRelationShipRepository.find({
            where: [
                { requesterId: user.id, status: RELATIONSHIP.FRIEND},
                { addresseeId: user.id, status: RELATIONSHIP.FRIEND}
            ],
            relations: ['addressee', 'requester']
        });

        const friendshipsDto: Friend[] = [];
        
        const onlinePlayers = await this.socketConnectionService.getOnlinePlayers();
        for (const friend of friendships) {
            const friendId = friend.addressee.id === user.id ? friend.requesterId : friend.addresseeId;

            friendshipsDto.push({
                id: friend.id,
                nickname: friend.addressee.id === user.id ? friend.requester.nickname : friend.addressee.nickname,
                friendId: friendId,
                isOnline: onlinePlayers.includes(friendId.toString())
            })
        }

        return friendshipsDto;
    }

    async profile(id: number, userId: number): Promise<UserProfileResponseDto> {
        const user = await this.usersRepository.findOne({
            where: { id }
        });

        if (!user) {
            throw new UserNotFoundException();
        }

        const userStats = await this.userStatsRepository.findOne({
            where: { userId: user.id }
        });

        if (!userStats) {
            throw new UserStatsNotFoundException();
        }

        const currentUser = await this.usersRepository.findOne({
            where: { id: userId }
        });

        if (!currentUser) {
            throw new UserNotFoundException();
        } 

        const friendships = await this.friendRelationShipRepository.find({
            where: [
                { requesterId: user.id, status: RELATIONSHIP.FRIEND},
                { addresseeId: user.id, status: RELATIONSHIP.FRIEND}
            ],
            relations: ['addressee', 'requester']
        });

        const friendshipsDto = await this.getFriends(user.id);

        const myFriendship = await this.friendRelationShipRepository.findOne({
            where: [
                { requesterId: user.id, addresseeId: currentUser.id },
                { requesterId: currentUser.id, addresseeId: user.id }
            ]
        });

        let offerFriendshipsDtp: OfferFriendship[] | null = null;
        if (id == userId) {
            const offers = await this.friendRelationShipRepository.find({
                where: { addresseeId: currentUser.id, status: RELATIONSHIP.OFFER },
                relations: ['requester']
            });

            offerFriendshipsDtp = offers.map((offer) => {
                return { id: offer.id, nickname: offer.requester.nickname, requesterId: offer.requester.id }
            })
        }

        const onlinePlayers = await this.socketConnectionService.getOnlinePlayers();
        const response: UserProfileResponseDto = {
            id: user.id,
            nickname: user.nickname,
            isOnline: onlinePlayers.includes(user.id.toString()),
            friends: friendshipsDto,
            isReported: false,
            relationship: myFriendship ? myFriendship.status : RELATIONSHIP.STRANGER,
            relationshipInitiator: myFriendship ? myFriendship?.requesterId : null,
            stats: {
                wins: userStats.wins,
                winSeries: userStats.winSeries,
                totalGames: userStats.totalGames
            },
            offersFriendship: offerFriendshipsDtp
        }

        return response;
    }

    async offerFriendship(friendId: number, currentUserId: number) {
        const user = await this.usersRepository.findOne({
            where: { id: friendId }
        });

        if (!user) {
            throw new UserNotFoundException();
        }

        if (user.id === currentUserId) {
            throw new InvalidFriendException();
        }

        const currentUser = await this.usersRepository.findOne({
            where: { id: currentUserId }
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

    async acceptFriendship(friendId: number, currentUserId: number) {
        if (friendId === currentUserId) {
            throw new InvalidFriendException();
        }

        const friendship = await this.friendRelationShipRepository.findOne({
            where: [
                { requesterId: currentUserId, addresseeId: friendId },
                { requesterId: friendId, addresseeId: currentUserId }
            ]
        });

        if (!friendship) {
            throw new FriendshipNotFoundException();
        }

        friendship.status = RELATIONSHIP.FRIEND;
        await this.friendRelationShipRepository.save(friendship);
    }

    async breakoffFriendship(friendId: number, currentUserId: number) {
        if (friendId === currentUserId) {
            throw new InvalidFriendException();
        }

        const friendship = await this.friendRelationShipRepository.findOne({
            where: [
                { requesterId: currentUserId, addresseeId: friendId },
                { requesterId: friendId, addresseeId: currentUserId }
            ]
        });

        if (!friendship) {
            throw new FriendshipNotFoundException();
        }

        await this.friendRelationShipRepository.softDelete(friendship.id);
    }
}
