import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalError,
} from '../../../errors';

describe('AppError', () => {
  it('should create an instance with message and status code', () => {
    const error = new AppError('Test error', 418);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(418);
    expect(error.isOperational).toBe(true);
  });

  it('should have a stack trace', () => {
    const error = new AppError('Test error', 500);

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('AppError');
  });
});

describe('BadRequestError', () => {
  it('should create a 400 error with default message', () => {
    const error = new BadRequestError();

    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Bad request');
  });

  it('should create a 400 error with custom message', () => {
    const error = new BadRequestError('Invalid input data');

    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Invalid input data');
  });
});

describe('UnauthorizedError', () => {
  it('should create a 401 error with default message', () => {
    const error = new UnauthorizedError();

    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Unauthorized');
  });

  it('should create a 401 error with custom message', () => {
    const error = new UnauthorizedError('Invalid credentials');

    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Invalid credentials');
  });
});

describe('ForbiddenError', () => {
  it('should create a 403 error with default message', () => {
    const error = new ForbiddenError();

    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe('Forbidden');
  });

  it('should create a 403 error with custom message', () => {
    const error = new ForbiddenError('Access denied');

    expect(error.statusCode).toBe(403);
    expect(error.message).toBe('Access denied');
  });
});

describe('NotFoundError', () => {
  it('should create a 404 error with default message', () => {
    const error = new NotFoundError();

    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Resource not found');
  });

  it('should create a 404 error with custom message', () => {
    const error = new NotFoundError('User not found');

    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('User not found');
  });
});

describe('ConflictError', () => {
  it('should create a 409 error with default message', () => {
    const error = new ConflictError();

    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(409);
    expect(error.message).toBe('Conflict');
  });

  it('should create a 409 error with custom message', () => {
    const error = new ConflictError('Resource already exists');

    expect(error.statusCode).toBe(409);
    expect(error.message).toBe('Resource already exists');
  });
});

describe('ValidationError', () => {
  it('should create a 422 error with default message', () => {
    const error = new ValidationError();

    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(422);
    expect(error.message).toBe('Validation failed');
  });

  it('should create a 422 error with custom message and details', () => {
    const details = { field: 'email', message: 'Invalid email format' };
    const error = new ValidationError('Validation failed', details);

    expect(error.statusCode).toBe(422);
    expect(error.message).toBe('Validation failed');
    expect(error.details).toEqual(details);
  });

  it('should store validation details', () => {
    const details = [
      { field: 'email', message: 'Required' },
      { field: 'password', message: 'Too short' },
    ];
    const error = new ValidationError('Multiple validation errors', details);

    expect(error.details).toEqual(details);
  });
});

describe('InternalError', () => {
  it('should create a 500 error with default message', () => {
    const error = new InternalError();

    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(500);
    expect(error.message).toBe('Internal server error');
  });

  it('should create a 500 error with custom message', () => {
    const error = new InternalError('Database connection failed');

    expect(error.statusCode).toBe(500);
    expect(error.message).toBe('Database connection failed');
  });
});

describe('Error class inheritance', () => {
  it('should all inherit from Error', () => {
    expect(new BadRequestError()).toBeInstanceOf(Error);
    expect(new UnauthorizedError()).toBeInstanceOf(Error);
    expect(new ForbiddenError()).toBeInstanceOf(Error);
    expect(new NotFoundError()).toBeInstanceOf(Error);
    expect(new ConflictError()).toBeInstanceOf(Error);
    expect(new ValidationError()).toBeInstanceOf(Error);
    expect(new InternalError()).toBeInstanceOf(Error);
  });

  it('should all inherit from AppError', () => {
    expect(new BadRequestError()).toBeInstanceOf(AppError);
    expect(new UnauthorizedError()).toBeInstanceOf(AppError);
    expect(new ForbiddenError()).toBeInstanceOf(AppError);
    expect(new NotFoundError()).toBeInstanceOf(AppError);
    expect(new ConflictError()).toBeInstanceOf(AppError);
    expect(new ValidationError()).toBeInstanceOf(AppError);
    expect(new InternalError()).toBeInstanceOf(AppError);
  });

  it('should all be operational errors', () => {
    expect(new BadRequestError().isOperational).toBe(true);
    expect(new UnauthorizedError().isOperational).toBe(true);
    expect(new ForbiddenError().isOperational).toBe(true);
    expect(new NotFoundError().isOperational).toBe(true);
    expect(new ConflictError().isOperational).toBe(true);
    expect(new ValidationError().isOperational).toBe(true);
    expect(new InternalError().isOperational).toBe(true);
  });
});