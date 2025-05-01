/**
 * Скрипт для исправления проблем с сохранением данных в Supabase
 */

import { supabase } from '../supabase-config.js';

// Функция для проверки и исправления политик RLS через SQL
async function fixRLSPolicies() {
  console.log('Проверка и исправление политик RLS...');
  
  try {
    // Проверяем, включен ли RLS для таблиц
    const { data: tablesData, error: tablesError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            table_name, 
            row_level_security 
          FROM 
            information_schema.tables 
          WHERE 
            table_schema = 'public' AND 
            table_name IN ('users', 'checkins', 'referrals')
        `
      });
    
    if (tablesError) {
      console.error('Ошибка при проверке RLS:', tablesError);
      return false;
    }
    
    console.log('Статус RLS для таблиц:', tablesData);
    
    // Проверяем политики RLS
    const { data: policiesData, error: policiesError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            tablename, 
            policyname, 
            permissive, 
            cmd 
          FROM 
            pg_policies 
          WHERE 
            schemaname = 'public' AND 
            tablename IN ('users', 'checkins', 'referrals')
        `
      });
    
    if (policiesError) {
      console.error('Ошибка при проверке политик:', policiesError);
      return false;
    }
    
    console.log('Существующие политики RLS:', policiesData);
    
    // Применяем SQL-скрипт для исправления политик RLS
    const response = await fetch('/sql/fix_rls_policies.sql');
    const sqlScript = await response.text();
    
    const { error: fixError } = await supabase.rpc('exec_sql', { sql: sqlScript });
    
    if (fixError) {
      console.error('Ошибка при исправлении политик RLS:', fixError);
      return false;
    }
    
    console.log('Политики RLS успешно обновлены');
    return true;
  } catch (error) {
    console.error('Критическая ошибка при исправлении политик RLS:', error);
    return false;
  }
}

// Функция для проверки и исправления типов данных
async function fixDataTypes() {
  console.log('Проверка и исправление типов данных...');
  
  try {
    // Проверяем типы данных в таблицах
    const { data: columnsData, error: columnsError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            table_name, 
            column_name, 
            data_type 
          FROM 
            information_schema.columns 
          WHERE 
            table_schema = 'public' AND 
            table_name IN ('users', 'checkins', 'referrals') AND
            column_name IN ('telegram_id', 'user_id', 'referrer_id', 'referred_id')
        `
      });
    
    if (columnsError) {
      console.error('Ошибка при проверке типов данных:', columnsError);
      return false;
    }
    
    console.log('Типы данных в таблицах:', columnsData);
    
    // Проверяем, нужно ли исправлять типы данных
    let needsFix = false;
    for (const column of columnsData) {
      if (column.column_name.includes('_id') && column.data_type !== 'text') {
        needsFix = true;
        break;
      }
    }
    
    if (needsFix) {
      console.log('Требуется исправление типов данных...');
      
      // Исправляем типы данных, если необходимо
      const fixScript = `
        -- Исправление типов данных для ID полей
        ALTER TABLE users ALTER COLUMN telegram_id TYPE TEXT;
        ALTER TABLE checkins ALTER COLUMN user_id TYPE TEXT;
        ALTER TABLE referrals ALTER COLUMN referrer_id TYPE TEXT;
        ALTER TABLE referrals ALTER COLUMN referred_id TYPE TEXT;
      `;
      
      const { error: fixError } = await supabase.rpc('exec_sql', { sql: fixScript });
      
      if (fixError) {
        console.error('Ошибка при исправлении типов данных:', fixError);
        return false;
      }
      
      console.log('Типы данных успешно исправлены');
    } else {
      console.log('Типы данных в порядке, исправление не требуется');
    }
    
    return true;
  } catch (error) {
    console.error('Критическая ошибка при исправлении типов данных:', error);
    return false;
  }
}

// Функция для проверки и исправления функции increment_xp
async function fixIncrementXPFunction() {
  console.log('Проверка и исправление функции increment_xp...');
  
  try {
    // Проверяем существование функции
    const { data: functionData, error: functionError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            routine_name, 
            data_type 
          FROM 
            information_schema.routines 
          WHERE 
            routine_schema = 'public' AND 
            routine_name = 'increment_xp'
        `
      });
    
    if (functionError) {
      console.error('Ошибка при проверке функции increment_xp:', functionError);
      return false;
    }
    
    console.log('Статус функции increment_xp:', functionData);
    
    // Обновляем функцию increment_xp
    const fixScript = `
      -- Пересоздаем функцию increment_xp с правильными типами данных
      CREATE OR REPLACE FUNCTION increment_xp(user_id TEXT, xp_amount INTEGER)
      RETURNS VOID AS $$
      BEGIN
        -- Обновляем количество XP пользователя
        UPDATE users
        SET points = COALESCE(points, 0) + xp_amount
        WHERE telegram_id = user_id;
        
        -- Если пользователь не найден, создаем нового
        IF NOT FOUND THEN
          INSERT INTO users (telegram_id, points)
          VALUES (user_id, xp_amount);
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    const { error: fixError } = await supabase.rpc('exec_sql', { sql: fixScript });
    
    if (fixError) {
      console.error('Ошибка при обновлении функции increment_xp:', fixError);
      return false;
    }
    
    console.log('Функция increment_xp успешно обновлена');
    return true;
  } catch (error) {
    console.error('Критическая ошибка при обновлении функции increment_xp:', error);
    return false;
  }
}

// Функция для исправления всех проблем
export async function fixAllSupabaseIssues() {
  console.log('Начинаем исправление проблем с Supabase...');
  
  // Проверяем соединение с Supabase
  try {
    const { data, error } = await supabase.from('users').select('count(*)', { count: 'exact', head: true });
    
    if (error) {
      console.error('Ошибка подключения к Supabase:', error);
      return {
        success: false,
        message: 'Не удалось подключиться к Supabase',
        error: error
      };
    }
    
    console.log('Подключение к Supabase успешно установлено');
  } catch (error) {
    console.error('Критическая ошибка при подключении к Supabase:', error);
    return {
      success: false,
      message: 'Критическая ошибка при подключении к Supabase',
      error: error
    };
  }
  
  // Исправляем политики RLS
  const rlsFixed = await fixRLSPolicies();
  if (!rlsFixed) {
    return {
      success: false,
      message: 'Не удалось исправить политики RLS',
      step: 'RLS'
    };
  }
  
  // Исправляем типы данных
  const typesFixed = await fixDataTypes();
  if (!typesFixed) {
    return {
      success: false,
      message: 'Не удалось исправить типы данных',
      step: 'DataTypes'
    };
  }
  
  // Исправляем функцию increment_xp
  const functionFixed = await fixIncrementXPFunction();
  if (!functionFixed) {
    return {
      success: false,
      message: 'Не удалось исправить функцию increment_xp',
      step: 'Function'
    };
  }
  
  console.log('Все проблемы с Supabase успешно исправлены!');
  return {
    success: true,
    message: 'Все проблемы с Supabase успешно исправлены'
  };
}

// Экспортируем отдельные функции для возможности вызова по отдельности
export {
  fixRLSPolicies,
  fixDataTypes,
  fixIncrementXPFunction
};
