import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { UserNotFoundException } from './exceptions/users.exception';


@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>
    ) {}

    async findOne(id: number): Promise<User> {
        const user = await this.usersRepository.findOne({
            where: { id }
        });

        if (!user) {
            throw new UserNotFoundException();
        }

        return user;
    }
}
