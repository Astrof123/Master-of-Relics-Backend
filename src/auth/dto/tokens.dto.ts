import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength, MaxLength, IsNotEmpty } from "class-validator"

export class TokensDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    accessToken: string

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    refreshToken: string
}