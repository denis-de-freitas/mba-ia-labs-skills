import { buscarUsuario, salvarUsuario, renderCard } from './usuarios';
import db from '../db';

jest.mock('../db');

describe('buscarUsuario', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve consultar o banco e retornar o resultado da query', () => {
    const esperado = [{ nome: 'Ana' }];
    db.query.mockReturnValue(esperado);

    const resultado = buscarUsuario('Ana');

    expect(db.query).toHaveBeenCalledTimes(1);
    expect(resultado).toBe(esperado);
  });

  it('deve montar a query com o nome informado', () => {
    db.query.mockReturnValue([]);

    buscarUsuario('Ana');

    expect(db.query).toHaveBeenCalledWith(
      "SELECT * FROM usuarios WHERE nome = 'Ana'"
    );
  });
});

describe('salvarUsuario', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve inserir o usuário no banco e retornar o resultado', () => {
    const usuario = { nome: 'Ana' };
    db.insert.mockReturnValue({ id: 1 });

    const resultado = salvarUsuario(usuario);

    expect(db.insert).toHaveBeenCalledWith('usuarios', usuario);
    expect(resultado).toEqual({ id: 1 });
  });

  it('deve engolir o erro e retornar undefined quando o insert falha', () => {
    db.insert.mockImplementation(() => {
      throw new Error('falha no banco');
    });

    expect(() => salvarUsuario({ nome: 'Ana' })).not.toThrow();
    expect(salvarUsuario({ nome: 'Ana' })).toBeUndefined();
  });
});

describe('renderCard', () => {
  it('deve escrever o nome do usuário no innerHTML do elemento card', () => {
    const elemento = { innerHTML: '' };
    document.getElementById = jest.fn().mockReturnValue(elemento);

    renderCard({ nome: 'Ana' });

    expect(document.getElementById).toHaveBeenCalledWith('card');
    expect(elemento.innerHTML).toBe('<b>Ana</b>');
  });
});
