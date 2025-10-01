# SafeFlow - Sistema de Finanças P2P

<img width="400" height="400" alt="SafeFlow Logo" src="https://github.com/user-attachments/assets/6a9d32a4-c248-489f-9a85-76ce77ab4356" />

**Um sistema de carteira digital P2P para simulação de transações financeiras seguras.**

SafeFlow é uma aplicação web full-stack desenvolvida para um hackathon, focada em oferecer uma plataforma de carteira digital peer-to-peer (P2P) com ênfase em usabilidade, segurança avançada e funcionalidades anti-fraude. Utiliza um banco de dados real (Supabase) para persistência de dados, mas as transações são simuladas, sem envolver dinheiro real. O design minimalista, com paleta de cores verde-escuro (#1B5E20), azul-marinho (#003087) e fundo claro (#f5f5f5), proporciona uma experiência de usuário intuitiva e profissional.

Acesse o protótipo em: [https://hackathon-safeflow.lovable.app/](https://hackathon-safeflow.lovable.app/)

## Equipe
- Thomas Janoski Soares da Silveira
- Théo Pansanato de Campos
- Gabriel Pelincel

## Funcionalidades
- **Carteira Digital**: Exibe saldo simulado e histórico de transações, com depósitos diretos (sem validação).
- **Transferências P2P**: Busca usuários por e-mail e realiza transferências em tempo real via Supabase.
- **Autenticação Segura**: Login com e-mail/senha, Google OAuth e suporte a 2FA (TOTP com QR code).
- **Anti-Fraude**: Registra logs de atividades suspeitas (ex: transferências altas, tentativas de login falhas).
- **Score de Crédito**: Calcula pontuação simulada com base em saldo e transações.
- **Páginas Estáticas**: Políticas de Privacidade e Termos de Serviço, acessíveis via `/privacy-policy` e `/terms-of-service`.
- **Feature Futura**: Empréstimos ágeis, conectando usuários a bancos parceiros para ofertas personalizadas com base no score de crédito.

## Arquitetura Técnica
- **Frontend**: React com Tailwind CSS para estilização responsiva, Vite como bundler para builds rápidas.
- **Backend**: Node.js com OpenAPI (abstraído pelo Lovable Cloud), integrado ao Supabase para lógica de negócios.
- **Banco de Dados**: Supabase (PostgreSQL) com tabelas `users` (id, email, name, birth_date, cpf, balance, two_fa_secret, credit_score), `transactions` (id, from_id, to_id, amount, timestamp, status), e `fraud_logs` (id, user_id, description, timestamp).
- **Autenticação**: Supabase Auth para login (e-mail, Google OAuth) e 2FA.
- **Segurança**: JWT para sessões, CORS para controle de acesso, HTTPS em produção.

## Pré-requisitos
- Node.js (v18 ou superior)
- Supabase CLI
- Conta Supabase com Google OAuth configurado
- Conta GitHub para acesso ao repositório

## Estrutura do Projeto

```
hackathon-safeflow/
├── src/                    # Frontend (React/Tailwind)
│   ├── components/         # Componentes (Auth, Dashboard, Transfer, etc.)
│   ├── App.js              # Ponto de entrada do React
│   └── supabaseClient.js   # Configuração do cliente Supabase
├── api/                    # Backend (OpenAPI endpoints, se exportado)
├── supabase/               # Migrations do Supabase
├── .env                    # Variáveis de ambiente (não comitado)
├── vite.config.js          # Configuração do Vite
└── package.json            # Dependências e scripts
```
