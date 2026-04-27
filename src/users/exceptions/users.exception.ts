import { HttpException, HttpStatus } from '@nestjs/common';
import { CustomHttpException } from 'src/common/custom-http.exception';

export class UserNotFoundException extends CustomHttpException {
    constructor() {
        super('Пользователь не найден', HttpStatus.NOT_FOUND);
    }
}

export class UserStatsNotFoundException extends CustomHttpException {
    constructor() {
        super('Статистика пользователя не найдена', HttpStatus.NOT_FOUND);
    }
}

export class InvalidFriendException extends CustomHttpException {
    constructor() {
        super('Нельзя добавить самого себя в друзья', HttpStatus.BAD_REQUEST);
    }
}

export class FriendshipNotFoundException extends CustomHttpException {
    constructor() {
        super('Дружба не найдена', HttpStatus.NOT_FOUND);
    }
}