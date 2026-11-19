import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * Renderiza dentro de um roteador em memória, começando na `rota` informada.
 * Necessário para componentes que usam Link, NavLink, useNavigate ou useParams.
 */
export function renderComRotas(ui, { rota = '/' } = {}) {
  return render(<MemoryRouter initialEntries={[rota]}>{ui}</MemoryRouter>);
}
