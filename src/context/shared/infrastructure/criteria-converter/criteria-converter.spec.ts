import { Criteria, Filter, FilterGroup, Operator } from '../../domain/criteria';
import { CriteriaConverter } from './criteria-converter';

describe('CriteriaConverter', () => {
  // Entidad dummy para los tests
  type Dummy = { id: string; name: string; createdAt: Date; age: number };

  it('convierte un filtro simple EQUALS', () => {
    const criteria = new Criteria<Dummy>([
      new Filter('name', Operator.EQUALS, 'John'),
    ]);
    const { sql, parameters } = CriteriaConverter.toPostgresSql(
      criteria,
      'dummy',
    );
    expect(sql).toContain('WHERE dummy.name = :name_0');
    expect(parameters).toEqual({ name_0: 'John' });
  });

  it('convierte un filtro compuesto AND', () => {
    const criteria = new Criteria<Dummy>([
      new FilterGroup('AND', [
        new Filter('name', Operator.EQUALS, 'John'),
        new Filter('age', Operator.GREATER_THAN, 18),
      ]),
    ]);
    const { sql, parameters } = CriteriaConverter.toPostgresSql(
      criteria,
      'dummy',
    );
    expect(sql).toContain('(dummy.name = :name_0 AND dummy.age > :age_1)');
    expect(parameters).toEqual({ name_0: 'John', age_1: 18 });
  });

  it('convierte un filtro compuesto OR', () => {
    const criteria = new Criteria<Dummy>([
      new FilterGroup('OR', [
        new Filter('name', Operator.EQUALS, 'John'),
        new Filter('name', Operator.EQUALS, 'Jane'),
      ]),
    ]);
    const { sql, parameters } = CriteriaConverter.toPostgresSql(
      criteria,
      'dummy',
    );
    expect(sql).toContain('(dummy.name = :name_0 OR dummy.name = :name_1)');
    expect(parameters).toEqual({ name_0: 'John', name_1: 'Jane' });
  });

  it('convierte un filtro IS_NULL', () => {
    const criteria = new Criteria<Dummy>([new Filter('age', Operator.IS_NULL)]);
    const { sql, parameters } = CriteriaConverter.toPostgresSql(
      criteria,
      'dummy',
    );
    expect(sql).toContain('dummy.age IS NULL');
    expect(parameters).toEqual({});
  });

  it('convierte orderBy, limit y offset', () => {
    const criteria = new Criteria<Dummy>(
      [new Filter('age', Operator.GREATER_THAN, 18)],
      { field: 'createdAt', direction: 'DESC' },
      10,
      5,
    );
    const { sql } = CriteriaConverter.toPostgresSql(criteria, 'dummy');
    expect(sql).toContain('ORDER BY dummy.createdAt DESC, dummy.id DESC');
    expect(sql).toContain('LIMIT 10');
    expect(sql).toContain('OFFSET 5');
  });

  it('convierte paginación por cursor', () => {
    const criteria = new Criteria<Dummy>(
      [new Filter('age', Operator.GREATER_THAN, 18)],
      { field: 'createdAt', direction: 'DESC' },
      10,
      undefined,
      {
        createdAt: new Date('2023-01-01'),
      },
    );
    const { sql, parameters } = CriteriaConverter.toPostgresSql(
      criteria,
      'dummy',
    );
    // Verifica que la cláusula del cursor es correcta y los parámetros existen
    expect(sql).toContain('dummy.createdAt < :cursor_createdAt');
    expect(parameters).toHaveProperty('cursor_createdAt');
  });

  it('permite paginación por cursor con múltiples campos de ordenamiento', () => {
    type Dummy = { id: string; createdAt: Date; score: number };
    const criteria = new Criteria<Dummy>(
      [],
      [
        { field: 'createdAt', direction: 'DESC' },
        { field: 'score', direction: 'ASC' },
      ],
      10,
      undefined,
      {
        createdAt: new Date('2024-01-01'),
        score: 50,
      },
    );
    const { sql, parameters } = CriteriaConverter.toPostgresSql(
      criteria,
      'dummy',
    );
    // Verifica que la cláusula del cursor es correcta y los parámetros existen
    expect(sql).toContain('dummy.createdAt < :cursor_createdAt');
    expect(sql).toContain('dummy.score > :cursor_score');
    expect(parameters).toHaveProperty('cursor_createdAt');
    expect(parameters).toHaveProperty('cursor_score');
  });

  it('maps domain field names to database column names using fieldNameMap with Criteria and Filter<T>', () => {
    // Definición del criterio usando nombres de dominio
    type User = { id: string; userName: string; createdAt: Date };
    const criteria = new Criteria<User>(
      [
        new Filter<User>(
          'createdAt',
          Operator.GREATER_THAN,
          new Date('2024-01-01'),
        ),
        new Filter<User>('userName', Operator.EQUALS, 'alice'),
      ],
      { field: 'createdAt', direction: 'DESC' },
      5,
    );

    // Mapeo de nombres de dominio a columnas reales
    const fieldNameMap = {
      createdAt: 'created_at',
      userName: 'user_name',
    };

    const { sql, parameters } = CriteriaConverter.toPostgresSql(
      criteria,
      'user',
      fieldNameMap,
    );

    // Verifica que los nombres de columna reales aparecen en la SQL
    expect(sql).toContain('user.created_at > :createdAt_0');
    expect(sql).toContain('user.user_name = :userName_1');
    expect(sql).toContain('ORDER BY user.created_at DESC, user.id DESC');
    expect(sql).toContain('LIMIT 5');
    // Verifica que los parámetros siguen usando el nombre del dominio
    expect(parameters).toHaveProperty('createdAt_0');
    expect(parameters).toHaveProperty('userName_1', 'alice');
  });
});
