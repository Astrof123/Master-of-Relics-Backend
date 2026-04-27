import { forwardRef, Module } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { CollectionController } from './collection.controller';
import { CardsService } from './cards.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserCollection } from './entities/collection.entity';
import { Card } from './entities/card.entity';
import { UsersModule } from 'src/users/users.module';
import { User } from 'src/users/entities/user.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([UserCollection]),
        TypeOrmModule.forFeature([Card]),
        TypeOrmModule.forFeature([User]),
        forwardRef(() => UsersModule),
    ],
    providers: [CollectionService, CardsService],
    controllers: [CollectionController],
    exports: [CardsService, CollectionService]
})
export class CollectionModule {}
