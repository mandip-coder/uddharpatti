import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

const app = express();

// Middleware
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://teenpatti-z6zf.onrender.com"
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow server-to-server / curl / health checks
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.error("Blocked by CORS:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);
app.options("*", cors());

app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

import authRoutes from './routes/authRoutes';
import friendRoutes from './routes/friendRoutes';
import debtRoutes from './routes/debtRoutes';
import userRoutes from './routes/userRoutes';
import settingsRoutes from './routes/settingsRoutes';
import tableRoutes from './routes/tableRoutes';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/debt', debtRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/tables', tableRoutes);

app.get('/', (req, res) => {

  res.send('Uddhar Patti API is running...');
});

export default app;
