import { HttpException, HttpStatus } from '@nestjs/common';
import { CustomException } from 'src/common/custom.exception';

export class UserAlreadyExistsException extends CustomException {
    constructor() {
        super('Пользователь с таким логином уже существует', HttpStatus.CONFLICT);
    }
}

export class InvalidCredentialsException extends CustomException {
    constructor() {
        super('Неверный логин или пароль', HttpStatus.UNAUTHORIZED);
    }
}

export class InvalidTokenException extends CustomException {
    constructor() {
        super('Вы не авторизованы', HttpStatus.UNAUTHORIZED);
    }
}

export class UserNotFoundException extends CustomException {
    constructor() {
        super('Пользователь не найден', HttpStatus.NOT_FOUND);
    }
}