
import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';
import Redis, { ChainableCommander } from 'ioredis';


jest.mock('ioredis', () => {
  const mockRedisClient = {
    call: jest.fn(),
    expire: jest.fn(),
    disconnect: jest.fn(),
    multi: jest.fn(),
    watch: jest.fn(),
    unwatch: jest.fn(),
    del: jest.fn(),
    ttl: jest.fn(),
    exists: jest.fn(),
    sadd: jest.fn(),
    zadd: jest.fn(),
    smembers: jest.fn(),
    zrange: jest.fn(),
    srem: jest.fn(),
    zrem: jest.fn(),
  };
  return jest.fn(() => mockRedisClient);
});

describe('RedisService', () => {
  let service: RedisService;
  let mockRedisClient: jest.Mocked<Redis>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: 'REDIS_CLIENT',
          useValue: {
            call: jest.fn(),
            expire: jest.fn(),
            disconnect: jest.fn(),
            multi: jest.fn(),
            watch: jest.fn(),
            unwatch: jest.fn(),
            del: jest.fn(),
            ttl: jest.fn(),
            exists: jest.fn(),
            sadd: jest.fn(),
            zadd: jest.fn(),
            smembers: jest.fn(),
            zrange: jest.fn(),
            srem: jest.fn(),
            zrem: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    mockRedisClient = module.get('REDIS_CLIENT');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleDestroy', () => {
    it('should disconnect redis client', () => {
      service.onModuleDestroy();
      expect(mockRedisClient.disconnect).toHaveBeenCalled();
    });
  });

  describe('setJson', () => {
    const key = 'test:key';
    const value = { foo: 'bar' };
    const ttl = 3600;

    it('should set JSON value without TTL', async () => {
      mockRedisClient.call.mockResolvedValue('OK');

      await service.setJson(key, '.', value);

      expect(mockRedisClient.call).toHaveBeenCalledWith(
        'JSON.SET',
        key,
        '.',
        JSON.stringify(value),
      );
      expect(mockRedisClient.expire).not.toHaveBeenCalled();
    });

    it('should set JSON value with TTL', async () => {
      mockRedisClient.call.mockResolvedValue('OK');
      mockRedisClient.expire.mockResolvedValue(1);

      await service.setJson(key, '.', value, ttl);

      expect(mockRedisClient.call).toHaveBeenCalled();
      expect(mockRedisClient.expire).toHaveBeenCalledWith(key, ttl);
    });

    it('should handle custom path', async () => {
      mockRedisClient.call.mockResolvedValue('OK');

      await service.setJson(key, '.nested.path', value);

      expect(mockRedisClient.call).toHaveBeenCalledWith(
        'JSON.SET',
        key,
        '.nested.path',
        JSON.stringify(value),
      );
    });
  });

  describe('getJson', () => {
    const key = 'test:key';
    const value = { foo: 'bar' };

    it('should get JSON value successfully', async () => {
      mockRedisClient.call.mockResolvedValue(JSON.stringify(value));

      const result = await service.getJson(key);

      expect(mockRedisClient.call).toHaveBeenCalledWith('JSON.GET', key, '.');
      expect(result).toEqual(value);
    });

    it('should return null when result is empty', async () => {
      mockRedisClient.call.mockResolvedValue(null);

      const result = await service.getJson(key);

      expect(result).toBeNull();
    });

    it('should return null when error occurs', async () => {
      mockRedisClient.call.mockRejectedValue(new Error('Redis error'));

      const result = await service.getJson(key);

      expect(result).toBeNull();
    });

    it('should handle custom path', async () => {
      mockRedisClient.call.mockResolvedValue(JSON.stringify(value));

      const result = await service.getJson(key, '.nested.path');

      expect(mockRedisClient.call).toHaveBeenCalledWith(
        'JSON.GET',
        key,
        '.nested.path',
      );
      expect(result).toEqual(value);
    });
  });

  describe('multi', () => {
    it('should return chainable commander', () => {
      const mockMulti = { exec: jest.fn() };
      mockRedisClient.multi.mockReturnValue(mockMulti as any);

      const result = service.multi();

      expect(mockRedisClient.multi).toHaveBeenCalled();
      expect(result).toBe(mockMulti);
    });
  });

  describe('execMulti', () => {
    it('should execute multi command', async () => {
      const mockMulti = { exec: jest.fn().mockResolvedValue(['OK']) } as any;
      const result = await service.execMulti(mockMulti);

      expect(mockMulti.exec).toHaveBeenCalled();
      expect(result).toEqual(['OK']);
    });

    it('should return null when exec fails', async () => {
      const mockMulti = { exec: jest.fn().mockResolvedValue(null) } as any;
      const result = await service.execMulti(mockMulti);

      expect(result).toBeNull();
    });
  });

  describe('watch', () => {
    it('should watch keys', async () => {
      const keys = ['key1', 'key2'];
      mockRedisClient.watch.mockResolvedValue('OK');

      await service.watch(...keys);

      expect(mockRedisClient.watch).toHaveBeenCalledWith(...keys);
    });
  });

  describe('unwatch', () => {
    it('should unwatch keys', async () => {
      mockRedisClient.unwatch.mockResolvedValue('OK');

      await service.unwatch();

      expect(mockRedisClient.unwatch).toHaveBeenCalled();
    });
  });

  describe('jsonSetInTransaction', () => {
    it('should add JSON SET to transaction', () => {
      const mockMulti = { call: jest.fn().mockReturnThis() } as any;
      const key = 'test:key';
      const path = '.';
      const value = { foo: 'bar' };

      const result = service.jsonSetInTransaction(mockMulti, key, path, value);

      expect(mockMulti.call).toHaveBeenCalledWith(
        'JSON.SET',
        key,
        path,
        JSON.stringify(value),
      );
      expect(result).toBe(mockMulti);
    });
  });

  describe('jsonGetInTransaction', () => {
    it('should add JSON GET to transaction', () => {
      const mockMulti = { call: jest.fn().mockReturnThis() } as any;
      const key = 'test:key';
      const path = '.';

      const result = service.jsonGetInTransaction(mockMulti, key, path);

      expect(mockMulti.call).toHaveBeenCalledWith('JSON.GET', key, path);
      expect(result).toBe(mockMulti);
    });
  });

  describe('arrayAppend', () => {
    it('should append values to array', async () => {
      const key = 'test:key';
      const path = '.array';
      const values = [1, 2, 3];
      mockRedisClient.call.mockResolvedValue('3');

      const result = await service.arrayAppend(key, path, ...values);

      expect(mockRedisClient.call).toHaveBeenCalledWith(
        'JSON.ARRAPPEND',
        key,
        path,
        JSON.stringify(1),
        JSON.stringify(2),
        JSON.stringify(3),
      );
      expect(result).toBe(3);
    });
  });

  describe('arrayPop', () => {
    it('should pop value from array', async () => {
      const key = 'test:key';
      const path = '.array';
      const value = { foo: 'bar' };
      mockRedisClient.call.mockResolvedValue(JSON.stringify(value));

      const result = await service.arrayPop(key, path);

      expect(mockRedisClient.call).toHaveBeenCalledWith(
        'JSON.ARRPOP',
        key,
        path,
        -1,
      );
      expect(result).toEqual(value);
    });

    it('should return null when no value', async () => {
      mockRedisClient.call.mockResolvedValue(null);

      const result = await service.arrayPop('test:key', '.array');

      expect(result).toBeNull();
    });

    it('should pop at specific index', async () => {
      const key = 'test:key';
      const path = '.array';
      const index = 0;
      mockRedisClient.call.mockResolvedValue(JSON.stringify('value'));

      await service.arrayPop(key, path, index);

      expect(mockRedisClient.call).toHaveBeenCalledWith(
        'JSON.ARRPOP',
        key,
        path,
        index,
      );
    });
  });

  describe('arrayLength', () => {
    it('should return array length', async () => {
      const key = 'test:key';
      const path = '.array';
      mockRedisClient.call.mockResolvedValue('5');

      const result = await service.arrayLength(key, path);

      expect(mockRedisClient.call).toHaveBeenCalledWith('JSON.ARRLEN', key, path);
      expect(result).toBe(5);
    });
  });

  describe('delete', () => {
    it('should delete with path', async () => {
      const key = 'test:key';
      const path = '.field';
      mockRedisClient.call.mockResolvedValue('OK');

      await service.delete(key, path);

      expect(mockRedisClient.call).toHaveBeenCalledWith('JSON.DEL', key, path);
    });

    it('should delete without path', async () => {
      const key = 'test:key';
      mockRedisClient.del.mockResolvedValue(1);

      await service.delete(key);

      expect(mockRedisClient.del).toHaveBeenCalledWith(key);
    });
  });

  describe('expire', () => {
    it('should set expiration', async () => {
      const key = 'test:key';
      const seconds = 3600;
      mockRedisClient.expire.mockResolvedValue(1);

      await service.expire(key, seconds);

      expect(mockRedisClient.expire).toHaveBeenCalledWith(key, seconds);
    });
  });

  describe('ttl', () => {
    it('should return TTL', async () => {
      const key = 'test:key';
      const ttl = 1234;
      mockRedisClient.ttl.mockResolvedValue(ttl);

      const result = await service.ttl(key);

      expect(mockRedisClient.ttl).toHaveBeenCalledWith(key);
      expect(result).toBe(ttl);
    });
  });

  describe('exists', () => {
    it('should return true when key exists', async () => {
      const key = 'test:key';
      mockRedisClient.exists.mockResolvedValue(1);

      const result = await service.exists(key);

      expect(result).toBe(true);
    });

    it('should return false when key does not exist', async () => {
      const key = 'test:key';
      mockRedisClient.exists.mockResolvedValue(0);

      const result = await service.exists(key);

      expect(result).toBe(false);
    });
  });

  describe('addToSet', () => {
    const key = 'test:set';
    const member = 'member1';

    it('should add member to set without TTL', async () => {
      mockRedisClient.sadd.mockResolvedValue(1);

      await service.addToSet(key, member);

      expect(mockRedisClient.sadd).toHaveBeenCalledWith(key, member);
      expect(mockRedisClient.expire).not.toHaveBeenCalled();
    });

    it('should add member to set with TTL', async () => {
      const ttl = 3600;
      mockRedisClient.sadd.mockResolvedValue(1);
      mockRedisClient.expire.mockResolvedValue(1);

      await service.addToSet(key, member, ttl);

      expect(mockRedisClient.sadd).toHaveBeenCalled();
      expect(mockRedisClient.expire).toHaveBeenCalledWith(key, ttl);
    });
  });

  describe('addToSortedSet', () => {
    const key = 'test:sorted-set';
    const score = 100;
    const member = 'member1';

    it('should add member to sorted set without TTL', async () => {
      mockRedisClient.zadd.mockResolvedValue("1");

      await service.addToSortedSet(key, score, member);

      expect(mockRedisClient.zadd).toHaveBeenCalledWith(key, score, member);
      expect(mockRedisClient.expire).not.toHaveBeenCalled();
    });

    it('should add member to sorted set with TTL', async () => {
      const ttl = 3600;
      mockRedisClient.zadd.mockResolvedValue("1");
      mockRedisClient.expire.mockResolvedValue(1);

      await service.addToSortedSet(key, score, member, ttl);

      expect(mockRedisClient.zadd).toHaveBeenCalled();
      expect(mockRedisClient.expire).toHaveBeenCalledWith(key, ttl);
    });
  });

  describe('getSetMembers', () => {
    it('should return all set members', async () => {
      const key = 'test:set';
      const members = ['member1', 'member2', 'member3'];
      mockRedisClient.smembers.mockResolvedValue(members);

      const result = await service.getSetMembers(key);

      expect(mockRedisClient.smembers).toHaveBeenCalledWith(key);
      expect(result).toEqual(members);
    });
  });

  describe('getSortedSetRange', () => {
    it('should return range of sorted set', async () => {
      const key = 'test:sorted-set';
      const start = 0;
      const stop = -1;
      const members = ['member1', 'member2', 'member3'];
      mockRedisClient.zrange.mockResolvedValue(members);

      const result = await service.getSortedSetRange(key, start, stop);

      expect(mockRedisClient.zrange).toHaveBeenCalledWith(key, start, stop);
      expect(result).toEqual(members);
    });
  });

  describe('removeFromSet', () => {
    it('should remove member from set', async () => {
      const key = 'test:set';
      const member = 'member1';
      mockRedisClient.srem.mockResolvedValue(1);

      await service.removeFromSet(key, member);

      expect(mockRedisClient.srem).toHaveBeenCalledWith(key, member);
    });
  });

  describe('removeFromSortedSet', () => {
    it('should remove member from sorted set', async () => {
      const key = 'test:sorted-set';
      const member = 'member1';
      mockRedisClient.zrem.mockResolvedValue(1);

      await service.removeFromSortedSet(key, member);

      expect(mockRedisClient.zrem).toHaveBeenCalledWith(key, member);
    });
  });
});