/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Enums
  pgm.createType('task_type', ['forced_choice', 'single_item']);
  pgm.createType('modality_type', ['text', 'image', 'video', 'audio']);
  pgm.createType('source_type', ['human', 'ai']);
  pgm.createType('choice_label_type', ['human', 'ai']);

  // studies
  pgm.createTable('studies', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'text', notNull: true },
    description: { type: 'text' },
    is_active: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // stimuli
  pgm.createTable('stimuli', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    modality: { type: 'modality_type', notNull: true },
    source_type: { type: 'source_type', notNull: true },
    storage_key: { type: 'text' },
    text_content: { type: 'text' },
    model_name: { type: 'text' },
    generation_prompt: { type: 'text' },
    notes: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // study_trials
  pgm.createTable('study_trials', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    study_id: {
      type: 'uuid',
      notNull: true,
      references: 'studies',
      onDelete: 'cascade',
    },
    trial_index: { type: 'integer', notNull: true },
    task_type: { type: 'task_type', notNull: true },
    human_stimulus_id: { type: 'uuid', references: 'stimuli' },
    ai_stimulus_id: { type: 'uuid', references: 'stimuli' },
    single_stimulus_id: { type: 'uuid', references: 'stimuli' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('study_trials', 'study_trials_unique_index_per_study', {
    unique: ['study_id', 'trial_index'],
  });

  // participants
  pgm.createTable('participants', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    study_id: {
      type: 'uuid',
      references: 'studies',
      onDelete: 'set null',
    },
    age: { type: 'integer' },
    approx_location: { type: 'text' },
    education_level: { type: 'text' },
    ai_literacy: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // responses
  pgm.createTable('responses', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    study_id: {
      type: 'uuid',
      notNull: true,
      references: 'studies',
      onDelete: 'cascade',
    },
    trial_id: {
      type: 'uuid',
      notNull: true,
      references: 'study_trials',
      onDelete: 'cascade',
    },
    participant_id: {
      type: 'uuid',
      notNull: true,
      references: 'participants',
      onDelete: 'cascade',
    },
    choice_label: { type: 'choice_label_type', notNull: true }, // always "which is AI-generated?"
    confidence: { type: 'integer', notNull: true },
    explanation: { type: 'text' },
    is_correct: { type: 'boolean' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('responses', ['study_id', 'participant_id']);
  pgm.createIndex('responses', ['study_id', 'trial_id']);

  // experimenters (admin panel users)
  pgm.createTable('experimenters', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    email: { type: 'text', notNull: true, unique: true },
    password_hash: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('experimenters');
  pgm.dropIndex('responses', ['study_id', 'trial_id']);
  pgm.dropIndex('responses', ['study_id', 'participant_id']);
  pgm.dropTable('responses');
  pgm.dropTable('participants');
  pgm.dropConstraint('study_trials', 'study_trials_unique_index_per_study');
  pgm.dropTable('study_trials');
  pgm.dropTable('stimuli');
  pgm.dropTable('studies');

  pgm.dropType('choice_label_type');
  pgm.dropType('source_type');
  pgm.dropType('modality_type');
  pgm.dropType('task_type');
};