import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { UserStats } from "./entities/user-stats.entity";
import { Repository } from "typeorm";
import { UserStatsNotFoundException } from "./exceptions/users.exception";

@Injectable()
export class UsersStatsService {
    constructor (
        @InjectRepository(UserStats)
        private userStatsRepository: Repository<UserStats>,
    ) {}

    async setWin(userId: number) {
        const userStats = await this.userStatsRepository.findOne({
            where: { userId }
        })

        if (!userStats) {
            throw new UserStatsNotFoundException();
        }

        userStats.wins += 1;
        userStats.winSeries += 1;
        userStats.totalGames += 1;

        await this.userStatsRepository.save(userStats);
    }

    async setLose(userId: number) {
        const userStats = await this.userStatsRepository.findOne({
            where: { userId }
        })

        if (!userStats) {
            throw new UserStatsNotFoundException();
        }

        userStats.winSeries = 0;
        userStats.totalGames += 1;

        await this.userStatsRepository.save(userStats);
    }
}